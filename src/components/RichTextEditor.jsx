import { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// 簡易ツールバー付きリッチテキスト入力（太字・斜体・文字色・行揃え）
// react-quill を利用し、HTML（inline style の color）を出力するため PDF 側でも色を反映できる。
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 72 }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic"],
        [{ color: [] }],
        [{ list: "bullet" }, { list: "ordered" }],
        [{ align: [] }],
      ],
    }),
    []
  );
  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        defaultValue={value || ""}
        onChange={onChange}
        modules={modules}
        formats={["bold", "italic", "color", "list", "bullet", "ordered", "align"]}
        placeholder={placeholder}
        style={{ "--rt-min-h": `${minHeight}px` }}
      />
    </div>
  );
}