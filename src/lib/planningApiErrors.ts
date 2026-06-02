export function getHttpErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }

  if (error instanceof Error) {
    const match = error.message.match(/HTTP error\s+(\d{3})/i);
    if (match) return Number(match[1]);
  }

  return undefined;
}

export function getPlanningBusinessStatus(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null) {
    const responseBody = (error as { responseBody?: unknown }).responseBody;
    if (typeof responseBody === "object" && responseBody !== null) {
      const body = responseBody as Record<string, unknown>;
      const nestedData = body.data;
      if (typeof nestedData === "object" && nestedData !== null) {
        const nestedStatus = (nestedData as Record<string, unknown>).status;
        if (typeof nestedStatus === "string") return nestedStatus;
      }

      const status = body.status;
      if (typeof status === "string") return status;
      const errorCode = body.error;
      if (typeof errorCode === "string") return errorCode;
      const message = body.message;
      if (typeof message === "string") return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

export function getPlanningMutationMessage(
  error: unknown,
  fallback: string,
  statusMessageMap: Record<string, string>,
): string {
  const status = getPlanningBusinessStatus(error)?.toLowerCase();
  if (status && status in statusMessageMap) {
    return statusMessageMap[status];
  }
  return fallback;
}

export function getPlanningShiftMutationMessage(error: unknown, fallback: string): string {
  return getPlanningMutationMessage(error, fallback, {
    planning_shift_conflict: "Ce creneau chevauche un shift existant pour cet employe.",
  });
}
