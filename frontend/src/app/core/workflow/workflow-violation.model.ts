export interface AffectedRecord {
  type: string;
  id: string;
  label: string;
}

export interface CascadeAction {
  action: string;
  messageKey: string;
  ids: string[];
}

export interface WorkflowViolation {
  code: string;
  severity: 'BLOCK' | 'WARN';
  messageKey: string;
  params: Record<string, unknown>;
  affected: AffectedRecord[];
  cascade?: CascadeAction;
}

export interface WorkflowWarningPayload {
  type: 'WORKFLOW_WARNING' | 'WORKFLOW_BLOCKED';
  violations: WorkflowViolation[];
}
