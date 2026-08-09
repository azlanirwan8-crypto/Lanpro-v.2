sed -i -e '/<input/,/\/>/c\
                  <UncontrolledInput\
                    className="text-3xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border-none rounded-2xl px-3 py-2 w-full transition-all outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-200"\
                    placeholder="Issue Title"\
                    initialValue={task.title}\
                    onSave={(val: string) => updateTaskField(task.id, "title", val)}\
                    disabled={!isEditable}\
                  />' src/features/issues/TaskDetailModal.tsx
