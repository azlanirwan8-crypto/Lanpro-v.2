sed -i -e '/onClick={() => handleQuickAddSubtask/c\
                      onClick={wrapSubmit("addSubtask", () => handleQuickAddSubtask(task.id, task.type === "epic" ? "task" : "subtask"))}\
                      disabled={isSubmitting["addSubtask"]}' src/features/issues/TaskDetailModal.tsx
