// Stop page loading after 30 sec. It using for testing

setTimeout( ()=> {
  console.info('Timeout! Stop page loading');
  if (document.body != null) {
     document.body.setAttribute('axt-stop-by-timeout','');
  };
  window.stop();
}, 30000);

