import { useEffect, useRef, useState } from "react";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/components/ui-composed/module/toolbar";
import { ToggleButton, ToggleGroupPanel } from "@/components/ui-composed/module/toggle-group";
import styles from "./index.module.css";
import DOMPurify from "dompurify";


type Props = {
    placeholder?: string;
    value?: string;
    onChange?: (html: string) => void;
    maxLength?: number;
    info?: string;
    disabledGetHTML?: boolean
    disabledMenu?: boolean
};


export default function SimpleRichTextEditor({ placeholder, value, onChange, maxLength = 500, info, disabledGetHTML, disabledMenu }: Props) {


    const editorRef = useRef<HTMLDivElement>(null);

    const [formats, setFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        align: "left",
    });

    const [textLength, setTextLength] = useState(0);

    /* -----------------------------
      SYNC VALUE → EDITOR (CONTROLLED)
   ------------------------------ */
    useEffect(() => {
        if (!editorRef.current) return;

        const current = editorRef.current.innerHTML;

        // hindari overwrite kalau sama
        if (value !== current) {
            editorRef.current.innerHTML = value || "";
        }

        setTextLength(editorRef.current.innerText.length);
    }, [value]);



    /* -----------------------------
       FORMAT EXEC
    ------------------------------ */
    const exec = (command: string, val?: string) => {
        if (!editorRef.current) return;

        editorRef.current.focus();
        document.execCommand(command, false, val);

        handleInput(); // langsung sync setelah format
        updateFormats();
    };

    /* -----------------------------
        UPDATE FORMAT STATE
     ------------------------------ */
    const updateFormats = () => {
        setFormats({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            align: document.queryCommandState("justifyCenter")
                ? "center"
                : document.queryCommandState("justifyRight")
                    ? "right"
                    : "left",
        });
    };

    /* -----------------------------
           INPUT HANDLER
    ------------------------------ */
    const handleInput = () => {
        if (!editorRef.current) return;

        const text = editorRef.current.innerText;

        if (text.length > maxLength) {
            editorRef.current.innerText = text.slice(0, maxLength);
            setTextLength(maxLength);
            moveCaretToEnd(editorRef.current);
        } else {
            setTextLength(text.length);
        }

        if (onChange) {
            onChange(getCleanHTML());
        }
    };

    const moveCaretToEnd = (el: HTMLElement) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    };



    /* -----------------------------
          CLEAN HTML NORMALIZER
        ------------------------------ */
    const getCleanHTML = (): string => {
        if (!editorRef.current) return "";

        const el = editorRef.current;

        // Jika editor kosong (hanya whitespace), kembalikan string kosong
        if (el.innerText.trim() === "") return "";

        // Sanitize and return the editor's HTML content.
        // Kelebihan: Dengan DOMPurify, HTML yang diambil jadi aman dari XSS
        // misal user bisa saja inject <img src=x onerror=alert(1)> ke editor,
        // tetapi dengan disanitasi DOMPurify, property berbahaya seperti onerror akan dihapus.
        return DOMPurify.sanitize(el.innerHTML);

    };

    const getHTML = () => {
        if (!editorRef.current) return;
        const cleanHtml = getCleanHTML();
        alert(cleanHtml);
    };

    return (
        <>
            <div className={styles.wrapper}>
                {disabledMenu ? <div></div> :
                    <Toolbar className="!rounded-none !outline-none !border-none !bg-[var(--color-editor-toolbar-bg)]">

                        {/* BOLD */}
                        <ToolbarButton
                            className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] aria-[pressed=true]:!bg-[var(--color-editor-toolbar-button-selected)] aria-[pressed=true]:!text-[var(--color-editor-toolbar-button-active)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                            type="button"
                            aria-pressed={formats.bold}
                            data-active={formats.bold}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => exec("bold")}
                        >
                            <b>B</b>
                        </ToolbarButton>

                        {/* ITALIC */}
                        <ToolbarButton
                            className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] aria-[pressed=true]:!bg-[var(--color-editor-toolbar-button-selected)] aria-[pressed=true]:!text-[var(--color-editor-toolbar-button-active)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                            type="button"
                            aria-pressed={formats.italic}
                            data-active={formats.italic}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => exec("italic")}
                        >
                            <i>I</i>
                        </ToolbarButton>

                        {/* UNDERLINE */}
                        <ToolbarButton
                            className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] aria-[pressed=true]:!bg-[var(--color-editor-toolbar-button-selected)] aria-[pressed=true]:!text-[var(--color-editor-toolbar-button-active)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                            type="button"
                            aria-pressed={formats.underline}
                            data-active={formats.underline}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => exec("underline")}
                        >
                            <u>U</u>
                        </ToolbarButton>

                        <ToolbarSeparator />

                        {/* ALIGNMENT */}
                        <ToggleGroupPanel
                            value={[formats.align]}
                            className="!rounded-none !outline-none !border-none !bg-transparent"
                            onValueChange={(vals) => {
                                if (!vals?.length) return;
                                const val = vals[0];

                                if (val === "left") exec("justifyLeft");
                                if (val === "center") exec("justifyCenter");
                                if (val === "right") exec("justifyRight");
                            }}
                        >
                            <ToggleButton
                                className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                                aria-label="Align left"
                                value="left"
                            >
                                <AlignLeftIcon className={styles.Icon} />
                            </ToggleButton>

                            <ToggleButton
                                className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                                aria-label="Align center"
                                value="center"
                            >
                                <AlignCenterIcon className={styles.Icon} />
                            </ToggleButton>

                            <ToggleButton
                                className="!cursor-pointer !text-[var(--color-editor-toolbar-button)] hover:!bg-[var(--color-editor-toolbar-button-hover)] hover:!text-[var(--color-editor-foreground)] data-[pressed]:!bg-[var(--color-editor-toolbar-button-selected)] data-[pressed]:!text-[var(--color-editor-toolbar-button-active)]"
                                aria-label="Align right"
                                value="right"
                            >
                                <AlignRightIcon className={styles.Icon} />
                            </ToggleButton>
                        </ToggleGroupPanel>


                    </Toolbar>}

                {/* Editable Area */}
                <div
                    ref={editorRef}
                    className={styles.editor}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                    onInput={handleInput}
                />

                {/* Footer */}
                <div className={styles.footer}>
                    {disabledGetHTML ? <div></div> : (
                        <button type="button" onClick={getHTML}>
                            Ambil HTML
                        </button>
                    )}
                    <span>
                        {textLength} / {maxLength}
                    </span>
                </div>
            </div>
            <p className={styles.info}>{info}</p>
        </>
    );
}



function AlignLeftIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            stroke="currentcolor"
            strokeLinecap="round"
            {...props}
        >
            <path d="M2.5 3.5H13.5" />
            <path d="M2.5 9.5H13.5" />
            <path d="M2.5 6.5H10.5" />
            <path d="M2.5 12.5H10.5" />
        </svg>
    );
}

function AlignCenterIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            stroke="currentcolor"
            strokeLinecap="round"
            {...props}
        >
            <path d="M3 3.5H14" />
            <path d="M3 9.5H14" />
            <path d="M4.5 6.5H12.5" />
            <path d="M4.5 12.5H12.5" />
        </svg>
    );
}

function AlignRightIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            stroke="currentcolor"
            strokeLinecap="round"
            {...props}
        >
            <path d="M2.5 3.5H13.5" />
            <path d="M2.5 9.5H13.5" />
            <path d="M5.5 6.5H13.5" />
            <path d="M5.5 12.5H13.5" />
        </svg>
    );
} 
