"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";

interface LatexEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  readOnly?: boolean;
}

// LaTeX syntax definitions
const configureLaTeXLanguage = (monaco: Monaco) => {
  // Register a new language
  monaco.languages.register({ id: "latex" });

  // Set the LaTeX monarchLanguage
  monaco.languages.setMonarchTokensProvider("latex", {
    defaultToken: "",
    tokenizer: {
      root: [
        // Commands
        [/\\[a-zA-Z]+/, "keyword"],

        // Comments
        [/%.*$/, "comment"],

        // Math environments
        [/\$\$/, "string", "@math"],
        [/\$/, "string", "@math"],

        // Environments
        [
          /\\begin\{([^}]*)\}/,
          ["keyword", { token: "type", next: "@environment.$1" }],
        ],

        // Arguments
        [/\{/, "delimiter.curly", "@arguments"],
        [/\}/, "delimiter.curly"],

        // Brackets
        [/\[/, "delimiter.square", "@squareBrackets"],
        [/\]/, "delimiter.square"],

        // Parentheses
        [/\(/, "delimiter.parenthesis"],
        [/\)/, "delimiter.parenthesis"],
      ],

      arguments: [
        [/\{/, "delimiter.curly", "@arguments"],
        [/\}/, "delimiter.curly", "@pop"],
        [/./, "variable"],
      ],

      squareBrackets: [
        [/\[/, "delimiter.square", "@squareBrackets"],
        [/\]/, "delimiter.square", "@pop"],
        [/./, "attribute"],
      ],

      math: [
        [/\$\$|\$/, "string", "@pop"],
        [/\\[a-zA-Z]+/, "keyword.math"],
        [/[0-9+\-*/=()<>]/, "number"],
        [/./, "string"],
      ],

      environment: [
        [/\\end\{[^}]*\}/, { token: "keyword", next: "@pop" }],
        { include: "root" },
      ],
    },
  });

  // Define autocompletion suggestions
  monaco.languages.registerCompletionItemProvider("latex", {
    // @ts-ignore
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        {
          label: "\\begin{document}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "\\begin{document}\n\t$0\n\\end{document}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a document environment",
        },
        {
          label: "\\begin{figure}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "\\begin{figure}[${1:htbp}]\n\t\\centering\n\t$0\n\t\\caption{${2:caption}}\n\t\\label{fig:${3:label}}\n\\end{figure}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a figure environment",
        },
        {
          label: "\\begin{table}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${2:c}}\n\t\t$0\n\t\\end{tabular}\n\t\\caption{${3:caption}}\n\t\\label{tab:${4:label}}\n\\end{table}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a table environment",
        },
        {
          label: "\\section",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\section{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a section",
        },
        {
          label: "\\subsection",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\subsection{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a subsection",
        },
        {
          label: "\\textbf",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\textbf{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Bold text",
        },
        {
          label: "\\textit",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\textit{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Italic text",
        },
        {
          label: "\\cite",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\cite{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Citation",
        },
        {
          label: "\\ref",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "\\ref{$1}$0",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Reference",
        },
      ];

      return { suggestions };
    },
  });
};

export default function LatexEditor({
  content,
  onChange,
  readOnly = false,
}: LatexEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const monacoRef = useRef<Monaco | null>(null);

  // Handle Monaco editor initialization
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    configureLaTeXLanguage(monaco);
  };

  // Update editor content when the prop changes
  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      onChange(value);
    }
  };

  return (
    <div className="h-full w-full relative">
      <Editor
        height="100%"
        width="100%"
        language="latex"
        theme="light"
        value={editorContent}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          lineNumbers: "on",
          folding: true,
          readOnly: readOnly,
          scrollBeyondLastLine: false,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          matchBrackets: "always",
          renderLineHighlight: "all",
          tabSize: 2,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
        }}
      />
    </div>
  );
}
