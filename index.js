/*
 ** Querying elements
 */
const editor = document.getElementById("editor");
const output = document.getElementById("output");
const toolbar = document.getElementById("toolbar");
const ctx = editor.getContext("2d");
const nodes = [];

editor.height = window.innerHeight - toolbar.offsetHeight;
editor.width = window.innerWidth - output.offsetWidth;

const NODE_HEIGHT = 100;
const NODE_WIDTH = 200;
const CONNECTOR_SIZE = 10;

let draggingNode = null;
let currentMousePos = null;
let isConnecting = false;
let offsetX = 0;
let offsetY = 0;
let startNode = null;

/*
 ** Preparing handlers
 */
const actionHandlers = {
  compile: function () {
    const lines = [];

    nodes
      .toSorted((n1, n2) => n1.priority - n2.priority)
      .forEach((node) => {
        lines.push(node.compile());
      });

    if (output) {
      output.textContent = lines.join("\n");
    }
  },
  run: function () {
    if (output.textContent.trim().length > 0) {
      eval(output.textContent);
    }
  },
};

const nodeHandlers = {
  print: function () {
    nodes.push(new PrintNode(NODE_WIDTH + 20, 10));
    drawNodes();
  },
  variable: function () {
    nodes.push(new VariableNode(10, 10));
    drawNodes();
  },
};

/*
 ** Listening toolbar buttons
 */
function listenActionsClick() {
  const actionButtons = document.querySelectorAll("button[data-action]");
  actionButtons.forEach((btn) => {
    btn.addEventListener("click", function (event) {
      const handler = actionHandlers[event.target.dataset.action];
      if (handler) {
        handler.call();
      }
    });
  });
}

function listenNodesClick() {
  const nodeButtons = document.querySelectorAll("button[data-node]");
  nodeButtons.forEach((btn) => {
    btn.addEventListener("click", function (event) {
      const handler = nodeHandlers[event.target.dataset.node];
      if (handler) {
        handler.call();
      }
    });
  });
}

/*
 ** Drawing canvas
 */
function clearCanvas() {
  ctx.clearRect(0, 0, editor.height, editor.width);
}

function draw() {
  drawCanvas();
  drawNodes();
  drawConnectionPreview();
  drawConnections();
}

function drawBackground() {
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, editor.width, editor.height);
}

function drawCanvas() {
  clearCanvas();
  drawBackground();
}

function drawConnectionPreview() {
  if (isConnecting && startNode && currentMousePos) {
    ctx.beginPath();
    ctx.moveTo(
      startNode.x + startNode.width + CONNECTOR_SIZE,
      startNode.y + startNode.height / 2
    );
    ctx.lineTo(currentMousePos.x, currentMousePos.y);
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawConnections() {
  nodes.forEach((node) => {
    if (node.links.length > 0) {
      node.links.forEach((link) => {
        ctx.beginPath();
        ctx.moveTo(
          link.x + link.width + CONNECTOR_SIZE,
          link.y + link.height / 2
        );
        ctx.lineTo(node.x - CONNECTOR_SIZE, node.y + node.height / 2);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  });
}

function drawNodes() {
  nodes.forEach((node) => node.draw(ctx));
}

/*
 ** Nodes
 */
class Node {
  constructor(x, y, title, priority) {
    this.x = x;
    this.y = y;
    this.title = title;
    this.priority = priority;

    this.height = NODE_HEIGHT;
    this.width = NODE_WIDTH;

    this.identifier = `nd${nodes.length}`;
    this.links = [];
    this.connected = false;
  }

  compile() {
    throw new Error("Not implemented");
  }

  draw(ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    ctx.font = "14px Roboto";
    ctx.fillStyle = "black";
    ctx.fillText(this.title, this.x + 10, this.y + 20);
  }
}

class PrintNode extends Node {
  constructor(x, y) {
    super(x, y, "Print", 1);
  }

  compile() {
    return this.links.length
      ? this.links
          .map((link) => `console.log(${link ? link.identifier : ""});`)
          .join("\n")
      : "";
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawConnector();
  }

  drawConnector() {
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.height / 2, CONNECTOR_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = this.connected > 0 ? "#22c55e" : "#cbd5e1";
    ctx.fill();
    ctx.stroke();
  }
}

class VariableNode extends Node {
  constructor(x, y) {
    super(x, y, "Variable", 0);

    this.field = null;
    this.value = "";
  }

  appendField() {
    if (this.field) {
      this.field.style.left = `${this.x + 10}px`;
      this.field.style.top = `${this.y + 35 + toolbar.offsetHeight}px`;
    } else {
      this.field = document.createElement("input");
      this.field.type = "text";
      this.field.style.position = "absolute";
      this.field.style.left = `${this.x + 10}px`;
      this.field.style.top = `${this.y + 35 + toolbar.offsetHeight}px`;
      this.field.style.width = `${this.width - 30}px`;
      this.field.style.zIndex = nodes.length;

      this.field.addEventListener("input", (event) => {
        this.value = event.target.value;
      });

      document.body.appendChild(this.field);
    }
  }

  compile() {
    switch (typeof this.value) {
      case "string":
        return `const ${this.identifier} = "${this.value}";`;
      default:
        return `const ${this.identifier} = ${this.value};`;
    }
  }

  draw(ctx) {
    super.draw(ctx);

    this.appendField();
    this.drawConnector();
  }

  drawConnector() {
    ctx.beginPath();
    ctx.arc(
      this.x + this.width,
      this.y + this.height / 2,
      CONNECTOR_SIZE,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = this.connected > 0 ? "#22c55e" : "#cbd5e1";
    ctx.fill();
    ctx.stroke();
  }
}

/*
 ** Running everything
 */
if (editor) {
  listenActionsClick();
  listenNodesClick();

  draw();

  window.addEventListener("resize", () => {
    editor.height = window.innerHeight - toolbar.offsetHeight;
    editor.width = window.innerWidth - output.offsetWidth;

    draw();
  });
} else {
  console.error("There's no editor on the page.");
  console.error(
    'Please add a new one a the folllwing: <canvas class="editor-canvas" id="editor"></canvas>'
  );
}

/*
 ** Dragging nodes and connections
 */
editor.addEventListener("mousedown", (event) => {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  // Check if the click is on a node
  nodes.forEach((node) => {
    if (
      mouseX > node.x &&
      mouseX < node.x + node.width &&
      mouseY > node.y &&
      mouseY < node.y + node.height
    ) {
      draggingNode = node;
      offsetX = mouseX - node.x;
      offsetY = mouseY - node.y;
    }

    // Check if the click starts on a Variable Node's output
    if (
      mouseX > node.x + node.width - 10 &&
      mouseX < node.x + node.width + 10 &&
      mouseY > node.y + node.height / 2 - 10 &&
      mouseY < node.y + node.height / 2 + 10
    ) {
      isConnecting = true;
      startNode = node;
    }
  });
});

editor.addEventListener("mousemove", (event) => {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  if (draggingNode) {
    draggingNode.x = mouseX - offsetX;
    draggingNode.y = mouseY - offsetY;

    if (draggingNode.appendField) {
      draggingNode.appendField();
    }

    draw();
  }

  // Handle connection preview
  if (isConnecting) {
    currentMousePos = { x: mouseX, y: mouseY };
    draw();
  }
});

editor.addEventListener("mouseup", (event) => {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  nodes.forEach((node) => {
    // Complete connection
    if (
      startNode &&
      mouseX > node.x - 10 &&
      mouseX < node.x + 10 &&
      mouseY > node.y + node.height / 2 - 10 &&
      mouseY < node.y + node.height / 2 + 10
    ) {
      node.links.push(startNode);
      node.connected = true;

      startNode.connected = true;
    }
  });

  currentMousePos = null;
  draggingNode = null;
  isConnecting = false;
  offsetX = 0;
  offsetY = 0;
  startNode = null;

  draw();
});
