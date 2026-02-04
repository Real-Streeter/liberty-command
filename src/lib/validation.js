export const LIMITS = {
  TASK_CONTENT: 200,
  ESTIMATE: 10,
  USER_NAME: 50,
  RFP_NAME: 100,
  CARRIER_NAME: 100,
  RFP_NOTES: 500,
};

export function validateTask(formData) {
  const content = formData.get('task')?.trim();
  if (!content) return 'Task description is required.';
  if (content.length > LIMITS.TASK_CONTENT) return `Task description must be under ${LIMITS.TASK_CONTENT} characters.`;
  return null;
}

export function validateRfp(formData) {
  const name = formData.get('name')?.trim();
  const carrier = formData.get('carrier')?.trim();
  const progress = parseInt(formData.get('progress'));
  if (!name) return 'RFP name is required.';
  if (name.length > LIMITS.RFP_NAME) return `RFP name must be under ${LIMITS.RFP_NAME} characters.`;
  if (!carrier) return 'Carrier name is required.';
  if (carrier.length > LIMITS.CARRIER_NAME) return `Carrier name must be under ${LIMITS.CARRIER_NAME} characters.`;
  if (isNaN(progress) || progress < 0 || progress > 100) return 'Progress must be between 0 and 100.';
  return null;
}

export function validateUser(formData) {
  const name = formData.get('name')?.trim();
  if (!name) return 'User name is required.';
  if (name.length > LIMITS.USER_NAME) return `User name must be under ${LIMITS.USER_NAME} characters.`;
  return null;
}
