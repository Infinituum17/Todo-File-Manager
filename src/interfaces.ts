export type AddEvent = {
  type: "add";
};

export type SaveEvent = {
  type: "save";
};

export type RemoveEvent = {
  type: "remove";
  id: string;
};

export type ToggleEvent = {
  type: "toggle";
  id: string;
};

export type UpdateEvent = {
  type: "update";
  id: string;
  space: "title" | "description";
  content: string;
};

export type Events =
  | AddEvent
  | SaveEvent
  | RemoveEvent
  | ToggleEvent
  | UpdateEvent;
