import { resumeDocumentHandler } from "@/artifacts/resume/server";

// Custom data stream interface that's compatible with our implementation
export interface CustomDataStream {
  writeData: (data: { type: string; content: any }) => void;
  write?: (chunk: any) => void;
}

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: string;
  content: string;
  userId?: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: CustomDataStream;
}

export interface UpdateDocumentCallbackProps {
  document: {
    id: string;
    title: string;
    content: string;
    kind: string;
  };
  description: string;
  dataStream: CustomDataStream;
}

export interface DocumentHandler<T = string> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends string>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
      });

      // In a real app, save the document to a database
      console.log(
        `Document created: ${args.id}, ${args.title}, ${config.kind}`
      );

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
      });

      // In a real app, save the document to a database
      console.log(
        `Document updated: ${args.document.id}, ${args.document.title}, ${config.kind}`
      );

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  resumeDocumentHandler,
];

export const artifactKinds = ["resume"] as const;
