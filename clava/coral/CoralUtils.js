class CoralUtils {
  static isSharedBorrow() {

  }

  static isMutBorrow() {
  
  }

  static isBorrow() {
    return CoralUtils.isSharedBorrow() || CoralUtils.isMutBorrow();
  }

}