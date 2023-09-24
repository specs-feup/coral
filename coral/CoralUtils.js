
/**
 * Utility class for Coral
 */
class CoralUtils {

  /**
   * Returns true if the joinpoint is a borrow
   * @param {Type} type
   * @returns {boolean} True if the joinpoint is a borrow
   */
  static isBorrow(type) {
    return type.instanceOf("pointerType") ||
      (
        type.instanceOf("qualType") &&
        type.unqualifiedType.instanceOf("pointerType") &&
        type.unqualifiedType.pointee.instanceOf("qualType") &&
        type.unqualifiedType.pointee.qualifiers.includes("const")
      );
  }

  /**
   * Returns true if the joinpoint is a mutable borrow
   * @param {Type} type
   * @returns {boolean} True if the joinpoint is a mutable borrow
   */
  static isMutBorrow(type) {
    return type.instanceOf("pointerType") ||
      (
        type.instanceOf("qualType") &&
        type.unqualifiedType.instanceOf("pointerType") &&
        type.qualifiers.includes("restrict")
      );
  }

  /**
   * Returns true if the joinpoint is a borrow or a mutable borrow
   * @param {Type} type 
   * @returns {boolean} True if the joinpoint is a borrow or a mutable borrow  
   */
  static isReference(type) {
    return type.instanceOf("pointerType") ||
      (
        type.instanceOf("qualType") &&
        type.unqualifiedType.instanceOf("pointerType")
      );
  }





  //-------------------------------------
  static retrieveTy($varref) {
    return $varref.declaration.getUserField("ty");
  }


}