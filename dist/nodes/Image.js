"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const prosemirror_state_1 = require("prosemirror-state");
const re_resizable_1 = require("re-resizable");
const React = __importStar(require("react"));
const styled_components_1 = __importDefault(require("styled-components"));
const insertFiles_1 = __importDefault(require("../commands/insertFiles"));
const getDataTransferFiles_1 = __importDefault(require("../lib/getDataTransferFiles"));
const uploadPlaceholder_1 = __importDefault(require("../lib/uploadPlaceholder"));
const isVideo_1 = __importStar(require("../queries/isVideo"));
const Node_1 = __importDefault(require("./Node"));
const IMAGE_INPUT_REGEX = /!\[(?<alt>[^\]\[]*?)]\((?<filename>[^\]\[]*?)(?=\“|\))\“?(?<layoutclass>[^\]\[\”]+)?\”?\)$/;
const uploadPlugin = options => new prosemirror_state_1.Plugin({
    props: {
        handleDOMEvents: {
            paste(view, event) {
                if ((view.props.editable && !view.props.editable(view.state)) ||
                    !options.uploadMedia) {
                    return false;
                }
                if (!event.clipboardData)
                    return false;
                const files = Array.prototype.slice
                    .call(event.clipboardData.items)
                    .map(dt => dt.getAsFile())
                    .filter(file => file);
                if (files.length === 0)
                    return false;
                const { tr } = view.state;
                if (!tr.selection.empty) {
                    tr.deleteSelection();
                }
                const pos = tr.selection.from;
                insertFiles_1.default(view, event, pos, files, options);
                return true;
            },
            drop(view, event) {
                if ((view.props.editable && !view.props.editable(view.state)) ||
                    !options.uploadMedia) {
                    return false;
                }
                const files = getDataTransferFiles_1.default(event).filter(file => /image/i.test(file.type));
                if (files.length === 0) {
                    return false;
                }
                const result = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (result) {
                    insertFiles_1.default(view, event, result.pos, files, options);
                    return true;
                }
                return false;
            },
        },
    },
});
const IMAGE_CLASSES = ["right-50", "left-50"];
const getLayoutAndTitle = tokenTitle => {
    if (!tokenTitle)
        return {};
    if (IMAGE_CLASSES.includes(tokenTitle)) {
        return {
            layoutClass: tokenTitle,
        };
    }
    else {
        return {
            title: tokenTitle,
        };
    }
};
const downloadImageNode = async (node) => {
    const image = await fetch(node.attrs.src);
    const imageBlob = await image.blob();
    const imageURL = URL.createObjectURL(imageBlob);
    const extension = imageBlob.type.split("/")[1];
    const potentialName = node.attrs.alt || "image";
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${potentialName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
const ImageBox = ({ src, alt, title, props, handleResize, defaultWidth, defaultHeight, readOnly, }) => {
    const [width, setWidth] = React.useState(defaultWidth || 150);
    const [height, setHeight] = React.useState(defaultHeight || 150);
    const isVideoUrl = isVideo_1.default(src);
    const image = isVideoUrl ? (React.createElement("video", { style: { width: "100%", height: "100%" }, controls: true, src: isVideo_1.videoBlobFormat(src) })) : (React.createElement("img", { src: src, alt: alt, title: title, className: "personal-image", style: {
            width: "100%",
            height: "100%",
        } }));
    if (readOnly) {
        return React.createElement("div", { style: { width, height } }, image);
    }
    return (React.createElement(re_resizable_1.Resizable, { size: { width, height }, onResizeStop: (e, direction, ref, d) => {
            setWidth(width + d.width);
            setHeight(height + d.height);
            handleResize({
                props,
                size: {
                    width: width + d.width,
                    height: height + d.height,
                },
            });
        } }, image));
};
class Image extends Node_1.default {
    constructor() {
        super(...arguments);
        this.handleKeyDown = ({ node, getPos }) => event => {
            if (event.key === "Enter") {
                event.preventDefault();
                const { view } = this.editor;
                const $pos = view.state.doc.resolve(getPos() + node.nodeSize);
                view.dispatch(view.state.tr.setSelection(new prosemirror_state_1.TextSelection($pos)).split($pos.pos));
                view.focus();
                return;
            }
            if (event.key === "Backspace" && event.target.innerText === "") {
                const { view } = this.editor;
                const $pos = view.state.doc.resolve(getPos());
                const tr = view.state.tr.setSelection(new prosemirror_state_1.NodeSelection($pos));
                view.dispatch(tr.deleteSelection());
                view.focus();
                return;
            }
        };
        this.handleBlur = ({ node, getPos }) => event => {
            const alt = event.target.innerText;
            const { src, title, layoutClass } = node.attrs;
            if (alt === node.attrs.alt)
                return;
            const { view } = this.editor;
            const { tr } = view.state;
            const pos = getPos();
            const transaction = tr.setNodeMarkup(pos, undefined, {
                src,
                alt,
                title,
                layoutClass,
            });
            view.dispatch(transaction);
        };
        this.handleSelect = ({ getPos }) => event => {
            event.preventDefault();
            const { view } = this.editor;
            const $pos = view.state.doc.resolve(getPos());
            const transaction = view.state.tr.setSelection(new prosemirror_state_1.NodeSelection($pos));
            return view.dispatch(transaction);
        };
        this.handleDownload = ({ node }) => event => {
            event.preventDefault();
            event.stopPropagation();
            downloadImageNode(node);
        };
        this.handleResize = async ({ props, size }) => {
            var _a;
            const { view: { dispatch, state }, } = this.editor;
            const nodeAttrs = ((_a = props === null || props === void 0 ? void 0 : props.node) === null || _a === void 0 ? void 0 : _a.attrs) || {};
            const attrs = Object.assign(Object.assign({}, nodeAttrs), { title: null, width: size.width, height: size.height });
            const { selection } = state;
            dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
            return true;
        };
        this.component = props => {
            const { isSelected } = props;
            const { alt, src, title, layoutClass, width, height } = props.node.attrs;
            const className = layoutClass ? `image image-${layoutClass}` : "image";
            return (React.createElement("div", { contentEditable: false, className: className },
                React.createElement(ImageWrapper, { className: isSelected ? "ProseMirror-selectednode" : "", onMouseDown: this.handleSelect(props) },
                    React.createElement(ImageBox, { src: src, alt: alt, title: title, props: props, readOnly: this.editor.props.readOnly, defaultWidth: width, defaultHeight: height, handleResize: this.handleResize })),
                React.createElement(Caption, { onKeyDown: this.handleKeyDown(props), onBlur: this.handleBlur(props), className: "caption", tabIndex: -1, role: "textbox", contentEditable: true, suppressContentEditableWarning: true, "data-caption": this.options.dictionary.imageCaptionPlaceholder }, alt)));
        };
    }
    get name() {
        return "image";
    }
    get schema() {
        return {
            inline: true,
            attrs: {
                src: {},
                alt: {
                    default: null,
                },
                layoutClass: {
                    default: null,
                },
                title: {
                    default: null,
                },
                width: {
                    default: null,
                },
                height: {
                    default: null,
                },
            },
            content: "text*",
            marks: "",
            group: "inline",
            selectable: true,
            draggable: true,
            parseDOM: [
                {
                    tag: "div[class~=image]",
                    getAttrs: (dom) => {
                        const img = dom.getElementsByTagName("img")[0];
                        const className = dom.className;
                        const layoutClassMatched = className && className.match(/image-(.*)$/);
                        const layoutClass = layoutClassMatched
                            ? layoutClassMatched[1]
                            : null;
                        return {
                            src: img === null || img === void 0 ? void 0 : img.getAttribute("src"),
                            alt: img === null || img === void 0 ? void 0 : img.getAttribute("alt"),
                            title: img === null || img === void 0 ? void 0 : img.getAttribute("title"),
                            layoutClass: layoutClass,
                        };
                    },
                },
                {
                    tag: "img",
                    getAttrs: (dom) => {
                        return {
                            src: dom.getAttribute("src"),
                            alt: dom.getAttribute("alt"),
                            title: dom.getAttribute("title"),
                        };
                    },
                },
            ],
            toDOM: node => {
                const className = node.attrs.layoutClass
                    ? `image image-${node.attrs.layoutClass}`
                    : "image";
                return [
                    "div",
                    {
                        class: className,
                    },
                    [
                        "img",
                        Object.assign(Object.assign({}, node.attrs), { style: { width: node.attrs.width, height: node.attrs.height }, contentEditable: false }),
                    ],
                    ["p", { class: "caption" }, 0],
                ];
            },
        };
    }
    toMarkdown(state, node) {
        let markdown = " ![" +
            state.esc((node.attrs.alt || "").replace("\n", "") || "") +
            "](" +
            state.esc(node.attrs.src);
        const { width, height } = node.attrs;
        if (width || height) {
            markdown += `?=${width}${height ? "x" + height : ""}`;
        }
        if (node.attrs.layoutClass) {
            markdown += ' "' + state.esc(node.attrs.layoutClass) + '"';
        }
        else if (node.attrs.title) {
            markdown += ' "' + state.esc(node.attrs.title) + '"';
        }
        markdown += ")";
        state.write(markdown);
    }
    parseMarkdown() {
        return {
            node: "image",
            getAttrs: token => {
                let src = token.attrGet("src");
                const possibleImageSizeAttrs = src.split("?=");
                let width, height;
                if (possibleImageSizeAttrs[1]) {
                    const widthStringValue = possibleImageSizeAttrs[1].split("x");
                    width = widthStringValue[0].replace(/\D/g, "");
                    height = widthStringValue[1].replace(/\D/g, "");
                    if (src && width) {
                        src = src.replace(`${width}`, "");
                    }
                    if (src && height) {
                        src = src.replace(`x${height}`, "");
                    }
                }
                return Object.assign({ src: possibleImageSizeAttrs[0], alt: (token.children[0] && token.children[0].content) || null, width: width ? parseFloat(width) : null, height: height ? parseFloat(height) : null }, getLayoutAndTitle(token.attrGet("title")));
            },
        };
    }
    commands({ type }) {
        return {
            downloadImage: () => async (state) => {
                const { node } = state.selection;
                if (node.type.name !== "image") {
                    return false;
                }
                downloadImageNode(node);
                return true;
            },
            deleteImage: () => (state, dispatch) => {
                dispatch(state.tr.deleteSelection());
                return true;
            },
            alignRight: () => (state, dispatch) => {
                const attrs = Object.assign(Object.assign({}, state.selection.node.attrs), { title: null, layoutClass: "right-50" });
                const { selection } = state;
                dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
                return true;
            },
            alignLeft: () => (state, dispatch) => {
                const attrs = Object.assign(Object.assign({}, state.selection.node.attrs), { title: null, layoutClass: "left-50" });
                const { selection } = state;
                dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
                return true;
            },
            alignCenter: () => (state, dispatch) => {
                const attrs = Object.assign(Object.assign({}, state.selection.node.attrs), { layoutClass: null });
                const { selection } = state;
                dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
                return true;
            },
            createImage: attrs => (state, dispatch) => {
                const { selection } = state;
                const position = selection.$cursor
                    ? selection.$cursor.pos
                    : selection.$to.pos;
                const node = type.create(attrs);
                const transaction = state.tr.insert(position, node);
                dispatch(transaction);
                return true;
            },
        };
    }
    inputRules({ type }) {
        return [
            new prosemirror_inputrules_1.InputRule(IMAGE_INPUT_REGEX, (state, match, start, end) => {
                const [okay, alt, src, matchedTitle] = match;
                const { tr } = state;
                if (okay) {
                    tr.replaceWith(start - 1, end, type.create(Object.assign({ src,
                        alt }, getLayoutAndTitle(matchedTitle))));
                }
                return tr;
            }),
        ];
    }
    get plugins() {
        return [uploadPlaceholder_1.default, uploadPlugin(this.options)];
    }
}
exports.default = Image;
const Button = styled_components_1.default.button `
  position: absolute;
  top: 8px;
  right: 8px;
  border: 0;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.textSecondary};
  width: 24px;
  height: 24px;
  display: inline-block;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${props => props.theme.text};
    opacity: 1;
  }
`;
const ImageWrapper = styled_components_1.default.span `
  line-height: 0;
  display: inline-block;
  position: relative;

  &:hover {
    ${Button} {
      opacity: 0.9;
    }
  }
`;
const Caption = styled_components_1.default.p `
  border: 0;
  display: block;
  font-size: 13px;
  font-style: italic;
  font-weight: normal;
  color: ${props => props.theme.textSecondary};
  padding: 2px 0;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  cursor: text;

  &:empty:before {
    color: ${props => props.theme.placeholder};
    content: attr(data-caption);
    pointer-events: none;
  }
`;
//# sourceMappingURL=Image.js.map