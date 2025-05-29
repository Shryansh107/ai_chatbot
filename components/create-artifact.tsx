import  type { Dispatch, ReactNode, SetStateAction, ComponentType } from "react";

export type ArtifactActionContext<M = any> = {
  content: string;
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
};

type ArtifactAction<M = any> = {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: ArtifactActionContext<M>) => Promise<void> | void;
  isDisabled?: (context: ArtifactActionContext<M>) => boolean;
};

export type ArtifactToolbarItem = {
  description: string;
  icon: ReactNode;
  onClick: () => void;
};

interface ArtifactContent<M = any> {
  title?: string;
  content: string;
  onSaveContent: (updatedContent: string) => void;
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
  status?: "streaming" | "idle";
}

interface InitializeParameters<M = any> {
  documentId?: string;
  setMetadata: Dispatch<SetStateAction<M>>;
}

export interface UIArtifact {
  documentId?: string;
  title?: string;
  kind: string;
  content: string;
  isVisible: boolean;
  status: "streaming" | "idle";
}

export interface DataStreamDelta {
  type: string;
  content: any;
}

type ArtifactConfig<T extends string, M = any> = {
  kind: T;
  description: string;
  content: ComponentType<ArtifactContent<M>>;
  actions: Array<ArtifactAction<M>>;
  toolbar: ArtifactToolbarItem[];
  initialize?: (parameters: InitializeParameters<M>) => Promise<void>;
  onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataStreamDelta;
  }) => void;
};

export class Artifact<T extends string, M = any> {
  readonly kind: T;
  readonly description: string;
  readonly content: ComponentType<ArtifactContent<M>>;
  readonly actions: Array<ArtifactAction<M>>;
  readonly toolbar: ArtifactToolbarItem[];
  readonly initialize?: (parameters: InitializeParameters<M>) => Promise<void>;
  readonly onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataStreamDelta;
  }) => void;

  constructor(config: ArtifactConfig<T, M>) {
    this.kind = config.kind;
    this.description = config.description;
    this.content = config.content;
    this.actions = config.actions || [];
    this.toolbar = config.toolbar || [];
    this.initialize = config.initialize;
    this.onStreamPart = config.onStreamPart;
  }
}
