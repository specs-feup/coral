class CoralError extends Error {

  constructor(message) {
    super(message);
    this.name = 'CoralError';
  }
}
