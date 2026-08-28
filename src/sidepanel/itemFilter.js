export const UNASSIGNED_TAB_ID = "__unassigned__";

export function filterItemsByTabAndSearch(items, selectedGroupId, searchTerm) {
  const byGroup = items.filter((item) =>
    selectedGroupId === UNASSIGNED_TAB_ID ? item.groupId === null : item.groupId === selectedGroupId
  );

  if (!searchTerm) {
    return byGroup;
  }

  const needle = searchTerm.toLowerCase();
  return byGroup.filter((item) => item.name.toLowerCase().includes(needle));
}
