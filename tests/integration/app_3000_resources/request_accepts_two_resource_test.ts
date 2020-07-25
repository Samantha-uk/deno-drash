import members from "../../members.ts";
import { Rhum } from "../../deps.ts";

Rhum.testPlan("request_accepts_two_resource_test.ts", () => {
  Rhum.testSuite("/request-accepts-two", () => {
    Rhum.testCase("accepts one and multiple types", async () => {
      let response;

      response = await members.fetch.get(
        "http://localhost:3000/request-accepts-two",
        {
          headers: {
            Accept: "text/html;application/json",
          },
        },
      );
      Rhum.asserts.assertEquals(
        await response.text(),
        `<div>response: text/html</div>`,
      );

      response = await members.fetch.get(
        "http://localhost:3000/request-accepts-two",
        {
          headers: {
            Accept: "application/json;text/xml",
          },
        },
      );
      Rhum.asserts.assertEquals(
        await response.text(),
        `{"response":"application/json"}`,
      );

      response = await members.fetch.get(
        "http://localhost:3000/request-accepts-two",
        {
          headers: {
            Accept: "text/xml",
          },
        },
      );
      Rhum.asserts.assertEquals(
        await response.text(),
        `<response>text/xml</response>`,
      );
    });
  });
});

Rhum.run();
