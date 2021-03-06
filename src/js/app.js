App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function() {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContracts();
  },

  initContracts: function() {
    //bs-config.jsで"./src", "./build/contracts"から参照するように書いているので追加で書く必要がない
    $.getJSON("TokenSale.json", function(tokenSale) {
      //truffle-contractを使えるようにする
      App.contracts.TokenSale = TruffleContract(tokenSale);
      App.contracts.TokenSale.setProvider(App.web3Provider);
      App.contracts.TokenSale.deployed().then(function(tokenSale) {
        console.log(" Token Sale Address:", tokenSale.address);
      });
    }).done(function() {
      $.getJSON("MyToken.json", function(myToken) {
        App.contracts.MyToken = TruffleContract(myToken);
        App.contracts.MyToken.setProvider(App.web3Provider);
        App.contracts.MyToken.deployed().then(function(myToken) {
          console.log("My Token Address:", myToken.address);
        });

        App.listenForEvents();
        return App.render();
      });
    })
  },

  // 自動でロードするようにする
  listenForEvents: function() {
    App.contracts.TokenSale.deployed().then(function(instance) {
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest',
      }).watch(function(error, event) {
        console.log("event triggered", event);
        App.render();
      })
    })
  },

  render: function() {
    if (App.loading) {
      return;
    }
    App.loading = true;

    var loader  = $('#loader');
    var content = $('#content');

    //ロード中はcontentを隠して、loading..を表示させる
    loader.show();
    content.hide();

    // Account Addressをセットする
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    })

    // Load token sale contract
    App.contracts.TokenSale.deployed().then(function(instance) {
      tokenSaleInstance = instance;
      return tokenSaleInstance.tokenPrice();
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.fromWei(App.tokenPrice, "ether").toNumber());
      return tokenSaleInstance.tokensSold();
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);

      var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      // Load token contract
      App.contracts.MyToken.deployed().then(function(instance) {
        myTokenInstance = instance;
        return myTokenInstance.balanceOf(App.account);
      }).then(function(balance) {
        $('.token-balance').html(balance.toNumber());

        //ロードが終わったらloading..を隠して、contentを表示させる
        App.loading = false;
        loader.hide();
        content.show();
      })
    });
  },

  buyTokens: function() {
    $('#content').hide();
    $('#loader').show();
    var numberOfTokens = $('#numberOfTokens').val();
    App.contracts.TokenSale.deployed().then(function(instance) {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000 // Gas limit
      });
    }).then(function(result) {
      console.log("Tokens bought...")
      $('form').trigger('reset') // formをリセットする
      $('#content').show();
      $('#loader').hide();
      // Wait for Sell event
    });
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  })
});