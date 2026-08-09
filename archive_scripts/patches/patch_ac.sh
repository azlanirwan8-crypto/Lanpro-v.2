sed -i -e '/<textarea/,/\/>/c\
                        <UncontrolledTextarea\
                          initialValue={task.acceptanceCriteria || ""}\
                          onSave={(val: string) => {\
                             updateTaskField(task.id, "acceptanceCriteria", val);\
                             updateTaskField(task.id, "_editingAcceptanceCriteria", false);\
                          }}\
                          onCancel={() => updateTaskField(task.id, "_editingAcceptanceCriteria", false)}\
                          placeholder="Define the acceptance criteria here... (Markdown supported)"\
                          rows={6}\
                          className="w-full p-6 text-sm focus:outline-none resize-y leading-relaxed font-medium text-slate-700"\
                        />' src/features/issues/TaskDetailModal.tsx
