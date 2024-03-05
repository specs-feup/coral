export default class CoralError extends Error {

  constructor(message: string) {
    super(message);
    this.name = 'CoralError';
  }
}
