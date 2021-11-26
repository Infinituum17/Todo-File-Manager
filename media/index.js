// @ts-check

class DocumentParser {
  /** @returns {Array<{id: Number, title: string, description: string, isOptional: boolean, isChecked: boolean}>} */
  static parseTokens(/** @type {string} */ text) {
    const tokens = [];

    text.split("\n").forEach((line) => {
      if (line) {
        const parsedLine = this.parseLine(line, tokens.length);

        if (parsedLine && Object.keys(parsedLine).length !== 0) {
          tokens.push(parsedLine);
        }
      }
    });

    return tokens;
  }

  /** @returns {{id: Number, title: string, description: string, isOptional: boolean, isChecked: boolean}|{}} */
  static parseLine(/** @type {string} */ line, /** @type {Number} */ id) {
    const obj = {};

    // | - [x](title)(description)
    //
    // | - [-]()() -> TODO not completed
    // | - [?]()() -> TODO optional
    // | - [x]()() -> TODO completed
    // | Old regex: " /\[(x|\s|\?)\]\s{0,1}[^\[\]]*:\s{0,1}[^\[\]\:]+/gim "

    const integrity = /\s{0,1}\-\s{0,1}\[(x|\-|\?)\]\(.*\)\(.*\)/gi;

    if (integrity.test(line)) {
      const status = line.match(/\[(x|\-|\?)\]/gi)[0].replaceAll(/\[|\]/g, "");
      const [title, description] = line
        .match(/\(.*\)\(.*\)/gi)[0]
        .split(")(")
        .map((v) => v.replaceAll(/\(|\)/g, ""));

      obj.id = id;
      obj.title = title.trim();
      obj.description = description.trim();

      switch (status) {
        case "x":
          obj.isChecked = true;
          obj.isOptional = false;
          break;
        case "?":
          obj.isChecked = false;
          obj.isOptional = true;
          break;
        case "-":
          obj.isChecked = false;
          obj.isOptional = false;
          break;
        default:
          throw new Error("This should be unreachable");
      }
    }

    return obj;
  }
}

(() => {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const root = document.querySelector("#todo-file-root");

  // TODO: Implement communication between VSCode API and WebView

  window.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.type) {
      case "update":
        const text = message.text;

        updateContent(text);

        vscode.setState({ text });

        return;
    }
  });

  const updateContent = (/**@type {string} */ text) => {
    if (text.length === 0) {
      return;
    }

    const tokens = DocumentParser.parseTokens(text);

    // TODO Head
    let htmlbuffer = /* html */ `
      <div id="todo_head">
        <a title="Save file" class="rounded_button" id="todo_save">
          <i class="codicon codicon-save"></i>
        </a>
        <a title="Add new todo" class="rounded_button" id="todo_new">
          <i class="codicon codicon-add"></i>
        </a>
      </div>
    `;

    // TODO Body
    tokens.forEach((token) => {
      const currentStatus = token.isOptional
        ? "question"
        : token.isChecked
        ? "pass"
        : "circle-large-outline";

      const currentStatusTitle = token.isOptional
        ? "Optional"
        : token.isChecked
        ? "Completed"
        : "To complete";

      // TODO: Use kebab case

      htmlbuffer += /* html */ `
        <div class="todo" id="todo_${token.id}">
          <a class="rounded_button todo_status ${currentStatus}" title="${currentStatusTitle}">
            <i class="codicon codicon-${currentStatus}"></i>
          </a>
          <input type="text" class="todo_title" value="${token.title}" />
          <input type="text" class="todo_description" value="${token.description}" />
          <a class="rounded_button todo_delete" title="Delete">
            <i class="codicon codicon-trash"></i>
          </a>
        </div>
      `;
    });

    root.innerHTML = htmlbuffer;

    // TODO: Event Handling

    // @ts-ignore
    root
      .querySelector("#todo_head #todo_save")
      .addEventListener("click", () => vscode.postMessage({ type: "save" }));

    // @ts-ignore
    root
      .querySelector("#todo_head #todo_new")
      .addEventListener("click", () => vscode.postMessage({ type: "add" }));

    for (let i = 0; i < tokens.length; i++) {
      const currentElement = root.querySelector(`#todo_${i}`);

      // @ts-ignore
      currentElement
        .querySelector(`.todo_status`)
        .addEventListener("click", () =>
          vscode.postMessage({ type: "toggle", id: i })
        );
      // @ts-ignore
      currentElement
        .querySelector(`.todo_delete`)
        .addEventListener("click", () =>
          vscode.postMessage({ type: "remove", id: i })
        );
    }
  };

  const state = vscode.getState();

  if (state) {
    updateContent(state.text);
  }
})();
