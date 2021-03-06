import { Drash } from "../../../../mod.ts";

interface ICoffee {
  name: string;
}

export default class CoffeeResource extends Drash.Http.Resource {
  static paths = ["/coffee", "/coffee/:id"];

  protected coffee = new Map<number, ICoffee>([
    [17, { name: "Light" }],
    [18, { name: "Medium" }],
    [19, { name: "Dark" }],
  ]);

  public GET() {
    // @ts-ignore Ignoring because we don't care
    let coffeeId: any = this.request.getPathParam("id");
    const location = this.request.getUrlQueryParam("location");
    if (location) {
      if (location == "from_query") {
        coffeeId = this.request.getUrlQueryParam("id");
      }
    }

    if (!coffeeId) {
      this.response.body = "Please specify a coffee ID.";
      return this.response;
    }

    if (coffeeId === "123") {
      return this.response.redirect(302, "/coffee/17");
    }

    this.response.body = this.getCoffee(parseInt(coffeeId));
    return this.response;
  }

  protected getCoffee(coffeeId: number) {
    let coffee = null;

    try {
      coffee = this.coffee.get(coffeeId);
    } catch (error) {
      throw new Drash.Exceptions.HttpException(
        400,
        `Error getting coffee with ID "${coffeeId}". Error: ${error.message}.`,
      );
    }

    if (!coffee) {
      throw new Drash.Exceptions.HttpException(
        404,
        `Coffee with ID "${coffeeId}" not found.`,
      );
    }

    return coffee;
  }
}
