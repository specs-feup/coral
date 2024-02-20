class Variance {

    static CO = "co";
    static CONTRA = "contra";
    static IN = "in";

    /**
     * @param {Variance} variance
     * @returns {Variance}
     */
    static invert(variance) {
        switch (variance) {
            case Variance.CO:
                return Variance.CONTRA;
            case Variance.CONTRA:
                return Variance.CO;
            case Variance.IN:
                return Variance.IN;
        }
    }

    static xform(variance1, variance2) {
        switch (variance1) {
            case Variance.CO:
                return variance2;
            case Variance.CONTRA:
                return Variance.invert(variance2);
            case Variance.IN:
                return Variance.IN;
        }
    }
}
