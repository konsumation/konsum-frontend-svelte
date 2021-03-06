/**
 * Extract error description from response
 * @param {FetchResponse} response
 * @return {string}
 */
export async function handleFailedResponse(response) {
  let message = response.statusText;

  if (response.headers) {
    const ct = response.headers.get("Content-Type").replace(/;.*/, "");

    switch (ct) {
      case "text/plain":
        message += "\n" + (await response.text());
        break;
      case "text/html":
        const root = document.createElement("html");
        root.innerHTML = await response.text();

        for (const tag of ["title", "h1", "h2"]) {
          for (const item of root.getElementsByTagName(tag)) {
            const text = item.innerText;
            if (text) {
              return text;
            }
          }
        }
        break;
    }
  }

  console.log(message);
  alert(message);

  return message;
}
