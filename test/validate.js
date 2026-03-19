var Chess = require('chess.js').Chess || require('chess.js');
function L(id,name,desc,result,trap,cat,moves,expl){return{id:id,name:name,moves:moves}}

var PONZIANI_LINES=[
L('ponz-main-nxe4','Main Line: Nxe4','','',0,'main',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O'],{}),
L('ponz-main-deep','Main Line Deep','','',0,'main',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nf6','O-O','Be7','Re1','O-O','Nd2','Nxe5','Rxe5','d6','Re1'],{}),
L('ponz-main-positional','Positional Qd4','','',0,'main',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Nxg6','hxg6','Qd4','Qf6','Qxf6','gxf6','Be3'],{}),
L('ponz-main-exd4','Main Line exd4','','',0,'main',['e4','e5','Nf3','Nc6','c3','Nf6','d4','exd4','e5','Nd5','cxd4','Bb4+','Bd2','Bxd2+','Qxd2','d6'],{}),
L('ponz-nf6-d4-d6','Solid d6','','',0,'main',['e4','e5','Nf3','Nc6','c3','Nf6','d4','d6','Bd3','Be7','O-O','O-O','Nbd2','Re8','Re1','Bf8','Nf1','h6','Ng3'],{}),
L('ponz-countergambit-f6','Countergambit f6','','',0,'c',['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7'],{}),
L('ponz-countergambit-deep','Countergambit deep','','',0,'c',['e4','e5','Nf3','Nc6','c3','d5','Qa4','f6','Bb5','Ne7','exd5','Qxd5','d4','Bd7','O-O','e4','Nfd2','f5','Re1'],{}),
L('ponz-countergambit-bd7','Countergambit Bd7','','',0,'c',['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd7','exd5','Nd4','Qd1','Nxf3+','Qxf3','Nf6','Bc4','e4','Qe2'],{}),
L('ponz-leonhardt','Leonhardt','','',0,'c',['e4','e5','Nf3','Nc6','c3','d5','Qa4','Nf6','Nxe5','Bd6','Nxc6','bxc6','e5','Be7','exf6','Bxf6','Be2'],{}),
L('ponz-nxf2-trap','Nxf2 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Nxf2','Bxg6','Nxd1','Bxf7+','Ke7','Bg5+','Kd6','Nc4+','Kc5','Nba3'],{}),
L('ponz-d6-trap','d6 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','d6','Bb5+','c6','dxc6','bxc6','Nxc6'],{}),
L('ponz-bc5-trap','Bc5 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','Qa4','O-O','Qxe4'],{}),
L('ponz-bd6-trap','Bd6 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','d5','Qa4','Bd6','exd5','Ne7','d4'],{}),
L('ponz-dxe4-trap','dxe4 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','d5','Qa4','dxe4','Nxe5','Bd7','Nxd7','Qxd7','Qxe4+'],{}),
L('ponz-qh4-trap','Qh4 Trap','','',1,'t',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Ne7','Nxe5','Ng6','Bd3','Qh4','Ng4','Bc5','Qe2','O-O','O-O'],{}),
L('ponz-passive-d6','Passive d6','','',0,'o',['e4','e5','Nf3','Nc6','c3','d6','d4','Nf6','Bd3','Be7','O-O','O-O','Nbd2','Bg4','h3'],{}),
L('ponz-passive-be7','Passive Be7','','',0,'o',['e4','e5','Nf3','Nc6','c3','Be7','d4','d6','Bd3','Nf6','O-O','O-O','Nbd2','Re8','Re1','Bf8','Nf1','h6','Ng3'],{}),
L('ponz-f5','f5','','',0,'o',['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Qf6','Ng4','Qg6','Bf4','Nf6','d5','Ne5','Ne3'],{}),
L('ponz-f5-nxe5','f5 Nxe5','','',0,'o',['e4','e5','Nf3','Nc6','c3','f5','d4','fxe4','Nxe5','Nxe5','dxe5','Qh4+','g3','Qe7','Bf4'],{}),
L('ponz-bc5-main','Bc5','','',0,'o',['e4','e5','Nf3','Nc6','c3','Bc5','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Qxd5','Bc4','Qd8','O-O'],{}),
L('ponz-nge7','Nge7','','',0,'o',['e4','e5','Nf3','Nc6','c3','Nge7','d4','exd4','cxd4','d5','exd5','Nxd5','Bc4','Be7','O-O','O-O','Re1'],{}),
L('ponz-fraser','Fraser','','',0,'o',['e4','e5','Nf3','Nc6','c3','Nf6','d4','Nxe4','d5','Bc5','dxc6','Bxf2+','Ke2','Bb6','Qd5','Nf2','Rg1'],{}),
L('ponz-qf6','Qf6','','',0,'b',['e4','e5','Nf3','Nc6','c3','Qf6','d4','exd4','cxd4','Bb4+','Nc3','Nge7','d5','Nd8','Bd3'],{}),
L('ponz-qe7','Qe7','','',0,'b',['e4','e5','Nf3','Nc6','c3','Qe7','d4','d6','Bd3','Nf6','O-O','g6','Nbd2','Bg7','Re1'],{}),
L('ponz-a6','a6','','',0,'b',['e4','e5','Nf3','Nc6','c3','a6','d4','Nf6','Bd3','d6','O-O','Be7','Nbd2','O-O','Re1'],{})
];

var HIPPO_LINES=[
L('h1','e4 main','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','a6','Be2','b6','O-O','Bb7','Be3','e6','Qd2','Nd7','Rad1','Ne7','Rfe1','h6','Bc4','O-O','d5','e5'],{}),
L('h2','e4 deep f5','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','a6','Be2','b6','O-O','Bb7','Be3','e6','Qd2','Nd7','Rad1','Ne7','Rfe1','h6','Bc4','O-O','d5','e5','Qc1','f5','exf5','Nxf5','Bd3','Nf6','Ne4','Nxe4'],{}),
L('h3','e4 e5 push','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','e6','e5','d5','Be2','Ne7','O-O','Nd7','Be3','b6','Nd2','Bb7','f4','c5'],{}),
L('h4','e4 e5 deep c5','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','e6','e5','d5','Be2','Ne7','O-O','Nd7','Be3','b6','Nd2','Bb7','f4','c5','dxc5','bxc5','Nb3','O-O','Bf2','Nf5','Qd2','a5'],{}),
L('h5','d4 main','','',0,'',['d4','g6','c4','Bg7','Nc3','d6','e4','Nd7','Nf3','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','h6','Rad1','O-O','d5','e5'],{}),
L('h6','d4 e5 push','','',0,'',['d4','g6','c4','Bg7','Nc3','d6','e4','e6','Nf3','Nd7','Be2','Ne7','O-O','b6','e5','d5','c5','Bb7','b4','O-O'],{}),
L('h7','spassky deep','','',0,'',['Nf3','g6','c4','Bg7','d4','d6','Nc3','Nd7','e4','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qc2','h6','Rad1','O-O','d5','e5','Qc1','Kh7','g3','f5','exf5','Nxf5','Bd3','Bc8','Kg2','Nf6'],{}),
L('h8','c4 english','','',0,'',['c4','g6','Nc3','Bg7','d4','d6','e4','e6','Nf3','Nd7','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','h6','Rad1','a6','Rfe1','O-O'],{}),
L('h9','c4 quiet','','',0,'',['c4','g6','g3','Bg7','Bg2','d6','Nc3','e6','Nf3','Nd7','O-O','Ne7','d3','b6','e4','Bb7','Be3','h6','Qd2','a6','Rae1','O-O'],{}),
L('h10','nf3 reti','','',0,'',['Nf3','g6','c4','Bg7','d4','d6','Nc3','Nd7','e4','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qc2','h6','Rad1','O-O','d5','e5','Qc1','f5'],{}),
L('h11','nf3 quiet','','',0,'',['Nf3','g6','g3','Bg7','Bg2','d6','O-O','e6','d3','Ne7','e4','Nd7','Nc3','b6','Be3','Bb7','Qd2','h6','Nh4','a6','f4','O-O'],{}),
L('h12','austrian','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','f4','Nf6','Nf3','O-O','Bd3','Na6','O-O','c5','e5','Nd7'],{}),
L('h13','bc4','','',0,'',['e4','g6','d4','Bg7','Bc4','d6','Nf3','e6','O-O','Ne7','Nc3','Nd7','Be3','b6','Qd2','Bb7','Rad1','a6','Bb3','h6','Rfe1','O-O'],{}),
L('h14','h4 storm','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','h4','a6','h5','b6','hxg6','fxg6','Nf3','Bb7','Bc4','e6','Be3','Nd7','Qd2','Ne7','O-O-O','d5'],{}),
L('h15','bh6','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','a6','Be2','b6','O-O','Bb7','Be3','e6','Qd2','Nd7','Bh6','Bxh6','Qxh6','Ne7','Qd2','h6','Rad1','O-O','Rfe1','Nf5'],{}),
L('h16','f5 attack','','',0,'',['d4','g6','c4','Bg7','Nc3','d6','e4','Nd7','Nf3','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','h6','Rad1','O-O','d5','e5','Na4','f5','exf5','Nxf5','Bd3','Nf6','Nc3','g5'],{}),
L('h17','c5 break','','',0,'',['e4','g6','d4','Bg7','Nc3','d6','Nf3','e6','Be2','Nd7','O-O','Ne7','Be3','b6','e5','d5','Nd2','Bb7','f4','c5','dxc5','bxc5','Nb3','O-O','Bf2','Nf5','Qe1','Rc8'],{}),
L('h18','b5 expand','','',0,'',['d4','g6','c4','Bg7','Nc3','d6','e4','Nd7','Nf3','e6','Be2','b6','O-O','Bb7','Be3','Ne7','Qd2','a6','d5','e5','Na4','h6','Qc2','O-O','a3','b5','cxb5','axb5','Nc3','b4'],{})
];

var all = PONZIANI_LINES.concat(HIPPO_LINES);
var issues = 0;
all.forEach(function(line) {
  var game = new Chess();
  for(var i = 0; i < line.moves.length; i++) {
    var r = game.move(line.moves[i]);
    if(!r) {
      console.log('ILLEGAL: ' + line.name + ' move ' + i + ': \"' + line.moves[i] + '\" FEN: ' + game.fen());
      issues++;
      return;
    }
  }
  console.log('OK: ' + line.name + ' (' + line.moves.length + ' moves)');
});
console.log('---');
console.log('Total: ' + all.length + ' lines, Issues: ' + issues);
