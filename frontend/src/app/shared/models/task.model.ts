export type TaskStatus = 'OPEN' | 'DONE';

export interface TaskSummary {
  id: string;
  clientId?: string;
  clientName?: string;
  propertyId?: string;
  propertyTitle?: string;
  title: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
}

export interface TaskCreateRequest {
  clientId?: string;
  propertyId?: string;
  title: string;
  description?: string;
  dueDate: string;
}

/** Ohne outcome wird nur abgehakt; mit outcome entsteht zusaetzlich eine Gespraechsnotiz. */
export interface TaskCompleteRequest {
  outcome?: string;
  note?: string;
}
