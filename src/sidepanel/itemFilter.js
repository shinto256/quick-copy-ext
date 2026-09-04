import { UNASSIGNED_TAB_ID } from "../storage/tabOrder.js";

export { UNASSIGNED_TAB_ID };

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
