import SimplePass from "lara-js/api/lara/pass/SimplePass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";

import Query from "lara-js/api/weaver/Query.js";

/**
 * Infers which variables can be safely set as const, that are reachable from the given join point.
 *
 * E.g. transforms int i = 0; into const int i = 0;
 *
 * Does not support variables that are arrays, in those cases the code stays unchanged.
 */
export default class InferConstantVar extends SimplePass {

  /**
   * @return {string} Name of the pass
   * @override
   */
  get name() {
    return "InferConstantVar";
  }
  
  matchJoinpoint($jp) {
    if (
      !$jp.instanceOf("vardecl") || // Must be a variable declaration
      $jp.isGlobal || // Ignore global variables
      // $jp.isInsideHeader && // Ignore if inside any header (e.g. if, switch, loop...)
      $jp.type.instanceOf("arrayType") || // Ignore if array
      ($jp.type.instanceOf("qualType") && $jp.type.constant) // Already const
    ) return false;
    
    // Match if not used as write or readwrite
    return Query.searchFrom($jp.currentRegion, "varref", {"name": $jp.name, "use": u => (u !== "read")}).get().length === 0;
  }

  transformJoinpoint($jp) {

    // TODO: handle pointers and arrays
      $jp.type = $jp.type.asConst();

    return new PassResult(this, $jp);
  }

}