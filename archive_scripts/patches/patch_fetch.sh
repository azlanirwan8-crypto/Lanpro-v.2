sed -i -e '/if (data.status === "success") {/{
N
s/fetchTasks();/await fetchTasks();/
}' src/App.tsx
