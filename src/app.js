const button = document.querySelector('#simulate');
button?.addEventListener('click', () => {
  button.classList.toggle('done');
  button.textContent = button.classList.contains('done') ? 'Approved on demo policy' : 'Simulate approval';
});
console.info('DeepBook Risk Console demo loaded');
