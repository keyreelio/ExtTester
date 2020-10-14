// Stop page loading after 30 sec. It using for testing

setTimeout( ()=> {
  // if (document.body.getAttribute('axt-parser-timing') !== null) {
      console.info('Timeout! Stop page loading');
      if (document.body != null) {
          document.body.setAttribute('axt-stop-by-timeout','');
      };
      window.stop();
  // }
}, 30000);

