import { Drash } from "../../mod.ts";
import {
  Cookie,
  decoder,
  deleteCookie,
  encoder,
  setCookie,
  Status,
  STATUS_TEXT,
} from "../../deps.ts";

/**
 * @description
 *     views_path?: string
 *
 *         A string that contains the path to the views directory from
 *         your project directory. This must exist if the `views_renderer` property
 *         is set by you. Only needs to be set if you plan to return HTML
 *
 *           const server = new Drash.Http.Server({
 *             ...,
 *             views_path: "/public/views"
 *           })
 *
 *     template_engine?: boolean
 *
 *         True if you wish to use Drash's own template engine to render html files.
 *         The `views_path` property must be set if this is set to true
 *
 *             const server = new Drash.Http.Server({
 *               ...
 *               template_engine: true
 *             })
 */
export interface IOptions {
  views_path?: string;
  template_engine?: boolean;
  default_content_type?: string;
}

/**
 * Response handles sending a response to the client making the request.
 */
export class Response {
  /**
   * A property to hold the body of this response.
   */
  public body: boolean | null | object | string | undefined = "";

  /**
   * A property to hold this response's headers.
   */
  public headers: Headers;

  /**
   * The request object.
   */
  public request: Drash.Http.Request;

  /**
   * A property to hold this response's status code (e.g., 200 for OK).
   * This class uses Status and STATUS_TEXT from the Deno Standard
   * Modules' http_status module for response codes.
   */
  public status_code: number = Status.OK;

  /**
   * An object of options to help determine how this object should behave.
   */
  protected options: IOptions;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param request - Contains the request object
   */
  constructor(request: Drash.Http.Request) {
    this.request = request;
    this.headers = new Headers();
    this.headers.set("Content-Type", "application/json");
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Render html files. Can be used with Drash's template engine or basic HTML
   * files. This method will read a file based on the `views_path` and filename
   * passed in. When called, will set the response content type to "text/html"
   *
   * @deprecated
   * @param args - The arguments used to render.
   *
   * @remarks
   *     // if `views_path` is "/public/views",
   *     // file to read is "/public/views/users/add.html"
   *     const content = this.response.render('/users/add.html', { name: 'Drash' })
   *     if (!content) throw new Error(...)
   *     this.response.body = content
   *
   * @returns The html content of the view, or false if the `views_path` is not
   * set.
   */
  public render(
    ...args: unknown[]
  ): Promise<boolean | string> | boolean | string {
    if (!this.options.views_path) {
      return false;
    }

    if (Array.isArray(args)) {
      const data = args.length >= 2 ? args[1] : null;
      this.headers.set("Content-Type", "text/html");

      if (this.options.template_engine) {
        const engine = new Drash.Compilers.TemplateEngine(
          this.options.views_path,
        );
        return engine.render(args[0] as string, data);
      }

      const filename = (this.options.views_path += args[0]);
      const fileContentsRaw = Deno.readFileSync(filename);
      let decoded = decoder.decode(fileContentsRaw);
      return decoded;
    }

    return false;
  }

  /**
   * Create a cookie to be sent in the response. Note: Once set, it cannot be
   * read until the next request
   *
   * @param cookie - Object holding all the properties for a cookie object
   */
  public setCookie(cookie: Cookie): void {
    let response = {
      status: this.status_code,
      // The setCookie() method doesn't care what the body is. It only cares
      // about the response's headers. Our bodie is not assignable to the body
      // that the deleteCookie() method expects. Therefore, we just send in a
      // random body that matches the schema it expects.
      body: "",
      headers: this.headers,
    };
    setCookie(response, cookie);
  }

  /**
   * Delete a cookie before sending a response
   *
   * @param cookieName - The cookie name to delete
   */
  public delCookie(cookieName: string): void {
    let response = {
      status: this.status_code,
      // The deleteCookie() method doesn't care what the body is. It only cares
      // about the response's headers. Our bodie is not assignable to the body
      // that the deleteCookie() method expects. Therefore, we just send in a
      // random body that matches the schema it expects.
      body: "",
      headers: this.headers,
    };
    deleteCookie(response, cookieName);
  }

  /**
   * Generate a response.
   *
   * @returns The response in string form.
   */
  public generateResponse(): string {
    let contentType = this.headers.get("Content-Type");

    switch (contentType) {
      case "application/json":
        return this.body ? JSON.stringify(this.body) : "";
      case "application/xml":
      case "text/html":
      case "text/xml":
      case "text/plain":
      default:
        if (this.body === null) {
          return "null";
        }
        if (this.body === undefined) {
          return "undefined";
        }
        if (typeof this.body === "boolean") {
          return this.body.toString();
        }
        if (typeof this.body !== "string") {
          // final catch all, respond with a generic value
          return "null";
        }
        return this.body;
    }
  }

  /**
   * Get the status message based on the status code.
   *
   * @returns The status message associated with this.status_code. For example,
   * if the response's status_code is 200, then this method will return "OK" as
   * the status message.
   */
  public getStatusMessage(): null | string {
    let message = STATUS_TEXT.get(this.status_code);
    return message ? message : null;
  }

  /**
   * Get the full status message based on the status code. This is just the
   * status code and the status message together. For example:
   *
   * - If the status code is 200, then this will return "200 (OK)"
   * - If the status code is 404, then this will return "404 (Not Found)"
   *
   * @returns The status code
   */
  public getStatusMessageFull(): null | string {
    let message = STATUS_TEXT.get(this.status_code);
    return message ? `${this.status_code} (${message})` : null;
  }

  /**
   * Redirect the client to another URL.
   *
   * @param httpStatusCode - Response's status code.
   * - Permanent: (301 and 308)
   * - Temporary: (302, 303, and 307)
   * @param location - URL of desired redirection. Relative or external paths
   * (e.g., "/users/1", https://drash.land)
   *
   * @returns The final output to be sent.
   */
  public redirect(
    httpStatusCode: number,
    location: string,
  ): Drash.Interfaces.ResponseOutput {
    this.status_code = httpStatusCode;
    this.headers.set("Location", location);

    let output: Drash.Interfaces.ResponseOutput = {
      status: this.status_code,
      headers: this.headers,
      body: "",
    };

    this.request.respond(output);

    output.status_code = this.status_code;
    return output;
  }

  /**
   * Send the response to the client making the request.
   *
   * @returns A `Promise` of the output which is passed to `request.respond()`.
   * The output is only returned for unit testing purposes. It is not intended
   * to be used elsewhere as this call is the last call in the
   * request-resource-response lifecycle.
   */
  public async send(): Promise<Drash.Interfaces.ResponseOutput> {
    let body = this.generateResponse();
    let output: Drash.Interfaces.ResponseOutput = {
      status: this.status_code,
      headers: this.headers,
      body: encoder.encode(body),
    };

    this.request.respond(output);

    output.status_code = this.status_code;
    return output;
  }

  /**
   * Send the response of a static asset (e.g., a CSS file, JS file, PDF file,
   * etc.) to the client making the request.
   *
   * @param file - The file that will be served to the client.
   * @param contents - The content in a `Uint8Array`.
   *
   * @returns The final output to be sent.
   */
  public sendStatic(): Drash.Interfaces.ResponseOutput {
    let output: Drash.Interfaces.ResponseOutput = {
      status: this.status_code,
      headers: this.headers,
      body: this.body as Uint8Array,
    };

    this.request.respond(output);

    output.status_code = this.status_code;
    return output;
  }
}
