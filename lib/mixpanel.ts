import mixpanel, { Dict, Query } from "mixpanel-browser";

// TODO: Update for prod
mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "", {
  //api_host: "https://guestography.com/mixpanel",
  api_host: "http://localhost:3000/mixpanel",
});

// if (process.env.NODE_ENV !== "production") mixpanel.disable();

export const track = (name: string, props?: Dict) => mixpanel.track(name, props);

export const identify = (id: string) => mixpanel.identify(id);

export const Mixpanel = {
  identify: (id: string) => {
    mixpanel.identify(id);
  },
  alias: (id: string) => {
    mixpanel.alias(id);
  },
  track: (name: string, props?: Dict) => {
    mixpanel.track(name, props);
  },
  track_links: (query: Query, name: string) => {
    mixpanel.track_links(query, name, {
      referrer: document.referrer,
    });
  },
  people: {
    set: (props: Dict) => {
      mixpanel.people.set(props);
    },
  },
};