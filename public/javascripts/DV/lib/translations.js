// A tiny object to perform string substitution for translation
// No pluralization or anything fancier

// The simplest thing that could possibly work

// Initialize with an object containing
// language codes for keys and key->string for value
// i.e.
// {
//   'en': {
//     doc: 'Document',
//     annot: 'Highlight'
//   },{
//     'zh': {
//       doc:'文件'
//       annot: '註解'
//     }
//   }
//  }

(function(root,undefined) {

  var _ = root._;

  Translations = function( options ){
    this.aliases      = options.aliases || [];
    this.viewer       = options.viewer;
    this.locale       = this.viewer.schema.document.display_language || 'eng';
    options = root.DC_LANGUAGE_CODES ? root.DC_LANGUAGE_CODES : { language: this.locale, fallback: 'eng' };
    options.namespace = 'DV';
    // only initialize the i18n lib once
    // then put it into nonConflict
    if ( root.DV.I18n ){
      this.i18n = root.DV.I18n;
    } else {
      this.i18n = new I18n( options );
      root.DV.t = this.i18n.translate;
      root.DV.I18n = I18n.noConflict();
    }
  };



  // Aliases
  // we get strings like zh-cn and en-GB back from various browsers
  // We need to normalize that to a language set (where appropriate)
  //
  // since case differs between IE and chrome/firefox, the language
  // is converted to lowercase before the alias is evaluated
  //
  // an alias can be either a regex, string, or function
  // Examples:
  // { 'zh': 'zh-sg' }  // will use the zh language set for detected 'zh-sg'
  // { 'zh': ['zh-sg', 'zh-cn'] }  // use zh for both Singapore and PRC
  // { 'zh': new Regex('zh-\w{2}') }  // match anything that starts with zh-
  // { 'zh' function(lang){ return lang=='zh-cn' } } // same as the first example

  // accepts an array of aliases
  Translations.prototype.setAliases = function( aliases ){
    this.aliases = aliases || [];
    return this;
  };

  var evalAlias=function( alias, detected ){
    return ( ( _.isString(alias) && alias === detected ) ||
             ( _.isArray(alias) && -1 != alias.indexOf(detected) ) ||
             ( _.isRegExp(alias) && detected.match(alias) ) ||
             ( _.isFunction(alias) && true == alias.call( detected ) )
           );
  };

  // Sniffs the browser's navigator.language || navigator.userLanguage
  // converts it to lowercase and runs through each of the aliases
  // Sets the locale to the first matching alias
  Translations.prototype.detectLocale = function(){
    var lang = ( navigator.language || navigator.userLanguage || '' ).toLowerCase();
    for (var i = 0, l = this.aliases.length; i < l; i++) {
      var alias = this.aliases[i];
      for (var key in alias) {
        if ( alias.hasOwnProperty(key) && true === evalAlias( alias[key], lang ) ){
          lang = key;
          break;
        }
      }
    }

    if ( this.i18n.packForCode( lang ) )
      this.setLocale( lang );

    return this.locale;
  };


  Translations.prototype.setLocale = function( code ){

    if ( this.i18n.packForCode( code ) ){
      this.renderWithLocale( code );
    } else {

      var me  = this,
          url = this.viewer.schema.data.translationsURL.
            replace(/\{language\}/, code ).
            replace(/\{realm\}/, 'viewer' ) + '.json';

      root.DV.jQuery.ajax( {
        url: url,
        dataType: 'jsonp',
        success: function( translation ){
          this.i18n.load( translation );
          me.renderWithLocale( code );
        }
      } );
    }
    return this;
  };

  Translations.prototype.renderWithLocale = function( code ){
    // FIXME - The this.viewer.open('InitialLoad') call used to work, but now doesn't?
    // if ( this.locale != code ){
    //   this.locale = code;
    //   this.i18n.set('default', code );
    //   this.viewer.open('InitialLoad');
    // }
  };



})(this);
