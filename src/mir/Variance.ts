enum Variance {
    CO = "covariant",
    CONTRA = "contravariant",
    IN = "invariant",
}

namespace Variance {
    export function invert(variance: Variance): Variance {
        switch (variance) {
            case Variance.CO:
                return Variance.CONTRA;
            case Variance.CONTRA:
                return Variance.CO;
            case Variance.IN:
                return Variance.IN;
        }
    }

    export function xform(lhs: Variance, rhs: Variance) {
        switch (lhs) {
            case Variance.CO:
                return rhs;
            case Variance.CONTRA:
                return Variance.invert(rhs);
            case Variance.IN:
                return Variance.IN;
        }
    }
}

export default Variance;
