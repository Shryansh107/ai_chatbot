// Type definitions for artifacts
export interface StreamPart {
  type: string;
  content: unknown;
}

export interface ArtifactMetadata {
  [key: string]: any;
}

export interface ArtifactState {
  content: string;
  status: "idle" | "streaming" | "complete";
  [key: string]: any;
}

export type SetMetadataFunction<M> = React.Dispatch<React.SetStateAction<M>>;
export type SetArtifactFunction = React.Dispatch<
  React.SetStateAction<ArtifactState>
>;

export interface AppendMessageParams {
  appendMessage: (message: { role: string; content: string }) => void;
}
