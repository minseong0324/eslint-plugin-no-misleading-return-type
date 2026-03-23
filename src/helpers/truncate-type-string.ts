export function truncateTypeString(type: string, max = 80) {
  return type.length > max ? `${type.slice(0, max)}...` : type;
}
