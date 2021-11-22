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

    if (/\[(x|\s|\?)\]\s{0,1}[^\[\]]+:\s{0,1}[^\[\]\:]+/gim.test(line)) {
      const [, title, description] = line.trim().split(/\]|:/gi);
      const boxContent = line.slice(1, 2);

      obj.id = id;
      obj.title = title.trim();
      obj.description = description.trim();
      switch (boxContent) {
        case "x":
          obj.isChecked = true;
          obj.isOptional = false;
          break;
        case "?":
          obj.isChecked = false;
          obj.isOptional = true;
          break;
        case " ":
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

    // HTML Head
    let htmlbuffer = /* html */ `
      <div id="todo_head">
        <button class="rounded_button" id="todo_new">
          <i class="codicon codicon-add"></i>
        </button>
      </div>
    `;

    // HTML Body
    tokens.forEach((token) => {
      const currentStatus = token.isOptional
        ? "question"
        : token.isChecked
        ? "pass"
        : "circle-large-outline";

      htmlbuffer += /* html */ `
        <div class="todo" id="todo_${token.id}">
          <button class="rounded_button todo_status ${currentStatus}">
            <i class="codicon codicon-${currentStatus}"></i>
          </button>
          <input type="text" class="todo_title" value="${token.title}" />
          <input type="text" class="todo_description" value="${token.description}" />
          <button class="rounded_button todo_delete">
            <i class="codicon codicon-trash"></i>
          </button>
        </div>
      `;
    });

    root.innerHTML = htmlbuffer;
  };

  const state = vscode.getState();

  if (state) {
    updateContent(state.text);
  }
})();
