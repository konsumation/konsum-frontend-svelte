import { derived, readable } from "svelte/store";
import { Router, route, NotFound, Guard } from "svelte-guard-history-router";
import { Session } from "svelte-session-manager";

import Categories from "./pages/Categories.svelte";
import CategoryValueList from "./pages/CategoryValueList.svelte";
import Category from "./pages/Category.svelte";
import Insert from "./pages/Insert.svelte";
import About from "./pages/About.svelte";
import Backup from "./pages/Backup.svelte";
import Login from "./pages/Login.svelte";
import Home from "./pages/Home.svelte";
import App from "./App.svelte";
import { config } from "../package.json";

export const session = new Session(localStorage);

class SessionGuard extends Guard {
  async enter(transition) {
    if (!session.isValid) {
      return transition.redirect("/login");
    }
  }
}

const needsSession = new SessionGuard();

export const router = new Router(
  [
    route("*", NotFound),
    route("/*", Home),
    route("/login", Login),
    route("/about", About),
    route("/category", needsSession, Categories),
    route("/category/:category/list", needsSession, CategoryValueList),
    route("/category/:category", needsSession, Category),
    route("/insert", needsSession, Insert),
    route("/admin/backup", needsSession, Backup)
  ],
  config.urlPrefix
);

export const categories = derived(
  session,
  ($session, set) => {
    if ($session.isValid) {
      fetch(config.api + "/categories", {
        headers: session.authorizationHeader
      }).then(async data =>
        set((await data.json()).map(c => new _Category(c)))
      );
    } else {
      set([]);
    }
    return () => {};
  },
  []
);

export class _Category {
  constructor(json) {
    Object.defineProperties(this, {
      name: { value: json.name },
      unit: { value: json.unit },
      description: { value: json.description },
      _latestSubscriptions: { value: new Set() },
      _valuesSubscriptions: { value: new Set() }
    });
  }

  async _latest() {
    const data = await fetch(
      config.api + `/category/${this.name}/values?reverse=1&limit=1`,
      {
        headers: {
          "content-type": "application/json",
          ...session.authorizationHeader
        }
      }
    );

    const entry = (await data.json())[0];
    this._latestSubscriptions.forEach(subscription => subscription(entry));
  }

  get latest() {
    return {
      subscribe: subscription => {
        this._latestSubscriptions.add(subscription);
        subscription(undefined);
        this._latest();
        return () => this._latestSubscriptions.delete(subscription);
      }
    };
  }

  async _values() {
    const data = await fetch(config.api + `/category/${this.name}/values`, {
      headers: {
        "content-type": "application/json",
        ...session.authorizationHeader
      }
    });

    const values = await data.json();
    this._valuesSubscriptions.forEach(subscription => subscription(values));
  }

  get values() {
    return {
      subscribe: subscription => {
        this._valuesSubscriptions.add(subscription);
        subscription([]);
        this._values();
        return () => this._valuesSubscriptions.delete(subscription);
      }
    };
  }

  async insert(value, time) {
    return fetch(config.api + `/category/${this.name}/insert`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.authorizationHeader
      },
      body: JSON.stringify({ value, time: time.getTime() })
    });
  }
}

export const category = derived(
  [categories, router.keys.category],
  ([$categories, $categoryKey], set) => {
    set($categories.find(a => a.name === $categoryKey));
    return () => {};
  }
);

export const values = derived(
  [session, category],
  ([$session, $category], set) => {
    const c = $category;
    if (c === undefined || !session.isValid) {
      set([]);
    } else {
      fetch(config.api + `/category/${c.name}/values`, {
        headers: {
          "content-type": "application/json",
          ...session.authorizationHeader
        }
      }).then(async data => set(await data.json()));
    }
    return () => {};
  }
);

export const state = readable(
  { version: "unknown", uptime: -1, memory: { heapTotal: 0, heapUsed: 0 } },
  set => {
    const f = async () => {
      const data = await fetch(config.api + "/state");
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
