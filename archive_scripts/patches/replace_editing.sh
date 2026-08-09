sed -i -e 's/task._editingDescription/isEditingDescription/g' src/features/issues/TaskDetailModal.tsx
sed -i -e "s/updateTaskField(task.id, '_editingDescription', false)/setIsEditingDescription(false)/g" src/features/issues/TaskDetailModal.tsx
sed -i -e "s/updateTaskField(task.id, '_editingDescription', true)/setIsEditingDescription(true)/g" src/features/issues/TaskDetailModal.tsx

sed -i -e 's/task._editingAcceptanceCriteria/isEditingAcceptanceCriteria/g' src/features/issues/TaskDetailModal.tsx
sed -i -e "s/updateTaskField(task.id, '_editingAcceptanceCriteria', false)/setIsEditingAcceptanceCriteria(false)/g" src/features/issues/TaskDetailModal.tsx
sed -i -e "s/updateTaskField(task.id, '_editingAcceptanceCriteria', true)/setIsEditingAcceptanceCriteria(true)/g" src/features/issues/TaskDetailModal.tsx
