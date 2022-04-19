/* TODO(csilvers): fix these lint errors (http://eslint.org/docs/rules): */
/* eslint-disable comma-dangle, comma-spacing, eqeqeq, indent, max-len, no-unused-vars, one-var, prefer-template, space-infix-ops */
/* To fix, remove an entry above, run ka-lint, and fix errors. */

MathJax.Hub.Config({
    messageStyle: "none",
    skipStartupTypeset: true,
    jax: ["input/TeX","output/HTML-CSS"],
    extensions: ["tex2jax.js"],
    TeX: {
        extensions: [
            "AMSmath.js",
            "AMSsymbols.js",
            "noErrors.js",
            "noUndefined.js",
            "newcommand.js",
            "boldsymbol.js"
        ],
        Macros: {
            RR: "\\mathbb{R}",
            blue: "\\color{#6495ED}",
            orange: "\\color{#FFA500}",
            pink: "\\color{#FF00AF}",
            red: "\\color{#DF0030}",
            green: "\\color{#28AE7B}",
            gray: "\\color{gray}",
            purple: "\\color{#9D38BD}",
            blueA: "\\color{#CCFAFF}",
            blueB: "\\color{#80F6FF}",
            blueC: "\\color{#63D9EA}",
            blueD: "\\color{#11ACCD}",
            blueE: "\\color{#0C7F99}",
            tealA: "\\color{#94FFF5}",
            tealB: "\\color{#26EDD5}",
            tealC: "\\color{#01D1C1}",
            tealD: "\\color{#01A995}",
            tealE: "\\color{#208170}",
            greenA: "\\color{#B6FFB0}",
            greenB: "\\color{#8AF281}",
            greenC: "\\color{#74CF70}",
            greenD: "\\color{#1FAB54}",
            greenE: "\\color{#0D923F}",
            goldA: "\\color{#FFD0A9}",
            goldB: "\\color{#FFBB71}",
            goldC: "\\color{#FF9C39}",
            goldD: "\\color{#E07D10}",
            goldE: "\\color{#A75A05}",
            redA: "\\color{#FCA9A9}",
            redB: "\\color{#FF8482}",
            redC: "\\color{#F9685D}",
            redD: "\\color{#E84D39}",
            redE: "\\color{#BC2612}",
            maroonA: "\\color{#FFBDE0}",
            maroonB: "\\color{#FF92C6}",
            maroonC: "\\color{#ED5FA6}",
            maroonD: "\\color{#CA337C}",
            maroonE: "\\color{#9E034E}",
            purpleA: "\\color{#DDD7FF}",
            purpleB: "\\color{#C6B9FC}",
            purpleC: "\\color{#AA87FF}",
            purpleD: "\\color{#7854AB}",
            purpleE: "\\color{#543B78}",
            mintA: "\\color{#F5F9E8}",
            mintB: "\\color{#EDF2DF}",
            mintC: "\\color{#E0E5CC}",
            grayA: "\\color{#F6F7F7}",
            grayB: "\\color{#F0F1F2}",
            grayC: "\\color{#E3E5E6}",
            grayD: "\\color{#D6D8DA}",
            grayE: "\\color{#BABEC2}",
            grayF: "\\color{#888D93}",
            grayG: "\\color{#626569}",
            grayH: "\\color{#3B3E40}",
            grayI: "\\color{#21242C}",
            kaBlue: "\\color{#314453}",
            kaGreen: "\\color{#71B307}",
            // For rational exponents, we provide \^ instead of ^ which pushes
            // the exponent up higher so it's really clear that the fraction
            // is an exponent.
            "^": ["{}^{^{^{#1}}}", 1]
        },
        Augment: {
            Definitions: {
                macros: {
                    lrsplit: "LRSplit",
                    cancel: "Cancel",
                    lcm: ["NamedOp", 0],
                    gcf: ["NamedOp", 0]
                }
            },
            Parse: {
                prototype: {
                    LRSplit: function( name ) {
                        var num = this.GetArgument( name ),
                            den = this.GetArgument( name );
                        var frac = MathJax.ElementJax.mml.mfrac( MathJax.InputJax.TeX.Parse( '\\strut\\textstyle{'+num+'\\qquad}', this.stack.env ).mml(),
                            MathJax.InputJax.TeX.Parse( '\\strut\\textstyle{\\qquad '+den+'}', this.stack.env ).mml() );
                        frac.numalign = MathJax.ElementJax.mml.ALIGN.LEFT;
                        frac.denomalign = MathJax.ElementJax.mml.ALIGN.RIGHT;
                        frac.linethickness = "0em";
                        this.Push( frac );
                    },
                    Cancel: function( name ) {
                        this.Push( MathJax.ElementJax.mml.menclose( this.ParseArg( name ) ).With({ notation: MathJax.ElementJax.mml.NOTATION.UPDIAGONALSTRIKE }) );
                    }
                }
            }
        }
    },
    "HTML-CSS": {
        scale: 100,
        showMathMenu: false,
        availableFonts: [ "TeX" ],
        imageFont: null
    }
});

MathJax.Ajax.timeout = 60 * 1000;
MathJax.Ajax.loadError = (function( oldLoadError ) {
    return function( file ) {
        if (window.Khan) {
          Khan.warnMathJaxError(file);
        }
        // Otherwise will receive unresponsive script error when finally finish loading
        MathJax.Ajax.loadComplete = function( file ) { };
        oldLoadError.call( this, file );
    };
})( MathJax.Ajax.loadError );

MathJax.Hub.Register.StartupHook("HTML-CSS Jax - disable web fonts", function() {
    if (window.Khan) {
        Khan.warnFont();
    }
});

// Trying to monkey-patch MathJax.Message.Init to not throw errors
MathJax.Message.Init = (function( oldInit ) {
    return function( styles ) {
        if ( this.div && this.div.parentNode == null ) {
            var div = document.getElementById("MathJax_Message");
            if ( div && div.firstChild == null ) {
                var parent = div.parentNode;
                if ( parent ) {
                    parent.removeChild( div );
                }
            }
        }

        oldInit.call( this, styles );
    };
})( MathJax.Message.Init );

MathJax.Hub.Startup.onload();
