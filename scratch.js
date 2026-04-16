const getAuth = async () => {
  const res = await fetch('https://oauth2.quran.foundation/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: '33b5e2bc-359e-4ff1-9ea9-023d55feb0ad',
      client_secret: 'CgNRMrf1Jtly6169F.Z.tJKPKG',
      scope: 'content'
    })
  });
  const data = await res.json();
  console.log(data);
  return data.access_token;
};

const getTranslations = async (token) => {
  const res = await fetch('https://apis.quran.foundation/content/api/v4/resources/translations', {
    headers: {
      'x-auth-token': token,
      'x-client-id': '33b5e2bc-359e-4ff1-9ea9-023d55feb0ad',
       'Accept': 'application/json'
    }
  });
  const data = await res.json();
  if(data && data.translations){
      const t = data.translations.filter(x => x.author_name.includes('Khattab') || x.author_name.includes('International') || x.name.includes('International') || x.name.includes('Khattab'));
      console.log(t);
  } else {
      console.log("No translations list found or structure different", data);
  }
};

getAuth().then(token => getTranslations(token));
