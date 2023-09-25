
/**
 * Utility class for Coral
 */
class CoralUtils {

  /**
   * Returns true if the joinpoint is a borrow
   * @param {Type} type
   * @returns {boolean} True if the joinpoint is a borrow
   */
  static isTypeBorrow(type) {
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
  static isTypeMutBorrow(type) {
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


  static *uniqueNameGenerator() {
    let name = "a";
    let endChar = "z".charCodeAt(0);
    yield name;

    let i = name.length-1;
    while (true) {
      let curChar = name.charCodeAt(i);
      if (curChar === endChar) {
        // Keep looking backwards
        i--;
      } else if (i < 0) {
        // Must expand
        name = "a".repeat(name.length+1);
        yield name;
        i = name.length-1;
      } else {
        // Update current pos, propagate forward, and yield
        name = name.substring(0, i) + String.fromCharCode(curChar + 1) + "a".repeat(name.length-i-1);
        i = name.length-1;
        yield name;
      }
    }
  }


  //-------------------------------------
  static retrieveTy($varref) {
    return $varref.declaration.getUserField("ty");
  }


}