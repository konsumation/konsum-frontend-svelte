import { readable } from "svelte/store";
import {} from "./service-worker/registration.mjs";

import App from "./App.svelte";
import api from "consts:api";

export const server = readable(
  { memory: {} },
  set => {
    const f = async () => {
      const data = await fetch(api + "/state");
      set(await data.json());
    };

    f();

    const interval = setInterval(() => f(), 5000);

    return () => clearInterval(interval);
  }
);

export const now = readable(new Date(), set => {
  const interval = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(interval);
});


export default new App({
  target: document.body
});
