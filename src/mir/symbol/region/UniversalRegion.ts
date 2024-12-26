import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import Region from "@specs-feup/coral/mir/symbol/Region";

export default class UniversalRegion extends Region {
    override constrain(region: Region, node: CoralCfgNode.Class): boolean {
        return this.points.some(point => {
            this.addedEnds.add(point);
            return !region.add(point); // add regions (ends) and nodes (points)
        });
    }
}
