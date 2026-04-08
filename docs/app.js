async function loadTasks() {
  const res = await fetch('./data/tasks.json?ts=' + Date.now());
  if (!res.ok) {
    throw new Error('tasks.json の読み込みに失敗しました');
  }
  const data = await res.json();
  return data.items || [];
}

window.loadTasks = loadTasks;
