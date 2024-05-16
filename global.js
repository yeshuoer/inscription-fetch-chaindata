import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import crypto from 'crypto'

axios.defaults.timeout = 5000;

const config = dotenv.config().parsed;
const log = console.log.bind(console, '📦')

const { model, Schema } = mongoose;
const TransactionSchema = new Schema({
    id: {
        type: String,
        // 唯一索引
        unique:true
    },
    from:      String,
    to:        String,
    block:     {
        type: Number,
        index: true,
    },
    idx:       Number,
    timestamp: Number,
    input:     String
});

const EvmlogSchema = new Schema({
    hash:      String,
    address:   String,
    topics:    [String],
    data:      String,
    block:     {
        type: Number,
        index: true,
    },
    trxIndex:  Number,
    logIndex:  Number,
    timestamp: Number
});

const StatusSchema = new Schema({
    block:     Number,
});

const OrderSchema = new Schema({
    seller: String, // 0x
    creator: String,    // 0x contract address
    listId: {
        type: String,
        unique: true,
    }, // 0x txid
    ticker: String,
    amount: String,    // 0xa hex
    price: {
        type: String,
        default: '0',
    },  // 0xa32ef4 hex wei
    nonce: {
        type: String,
        default: '0',
    }, // '0'
    listingTime: Number,    // seconds
    expirationTime: {
        type: Number,
        default: 4871333268,
    },   // seconds
    updateDate: {
        type: Date,
        default: Date.now,
    },
    creatorFeeRate: {
        type: Number,
        default: 0,
    },  // 200 = 0.2%
    salt: {
        type: Number,
        default: 0,
    },
    extraParams: {
        type: String,
        default: '0x00',
    },
    input: String,
    status: {
        type: Number,
        default: 0,
    },
    signature: String,
    vrs: {
        v: Number,
        r: String,
        s: String,
    }
});

const Transaction = model('transaction', TransactionSchema, 'transactions');
const Evmlog = model('evmlog', EvmlogSchema, 'evmlogs');
const Status = model('status', StatusSchema, 'status');
const Order = model('order', OrderSchema, 'orders')

const connectMongo = async () => {
    // connect to database
    await mongoose.connect(config.MONGO_DSN);
}

const sleep = (ms) => new Promise(f => setTimeout(f, ms));

async function getLastBlockNumber() {
    const data = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
    };
    let arc = {
        method: 'post',
        maxBodyLength: Infinity,
        url: config.RPC_URL,
        data : data
    };
    const response = await axios.request(arc);
    if (response.status === 200) {
        if (response.data && typeof response.data.result == 'string') {
            // reduced by two blocks to prevent rollback
            return parseInt(response.data.result, 16) - 2;
        }
        throw new Error('empty result');
    } else {
        throw new Error('getLastBlockNumber error');
    }
}

async function getBlockByNumber(blockNumber) {
    const data = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: [
          '0x' + blockNumber.toString(16),
          true
        ],
    };
    let arc = {
        method: 'post',
        maxBodyLength: Infinity,
        url: config.RPC_URL,
        data : data
    };
    const response = await axios.request(arc);
    if (response.status === 200) {
        if (response.data && response.data.result) {
            return response.data.result;
        }
        throw new Error('Empty result');
    } else {
        throw new Error('getBlockByNumber error');
    }
}

async function getEvmLogs(fromBlock, toBlock) {
    const data = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16)
        }],
    };
    let arc = {
        method: 'post',
        maxBodyLength: Infinity,
        url: config.RPC_URL,
        data : data
    };
    const response = await axios.request(arc);
    if (response.status === 200) {
        if (response.data && response.data.result) {
            return response.data.result;
        }
        throw new Error('Empty result');
    } else {
        throw new Error('getEvmLogs error');
    }
}

async function getStatusId() {
    let statusRow = await Status.findOne({});
    if (!statusRow) {
        let lastBlock = 0;
        const lastTrx = await Transaction.findOne({}, null, { sort: { _id: -1 }});
        if (lastTrx) {
            lastBlock = parseInt(lastTrx.block);
        }
        const lastLog = await Evmlog.findOne({}, null, { sort: { _id: -1 }});
        if (lastLog) {
            const blockNumber = parseInt(lastLog.block);
            if (blockNumber > lastBlock) {
                lastBlock = blockNumber;
            }
        } 
        const result = await Status.create([ { block: lastBlock } ]);
        if (!result || !result.length) {
            throw new Error('insert block error');
        }
        statusRow = result[0];
    }
    console.log('statusId', statusRow._id, 'lastBlock', statusRow.block );
    return statusRow._id;
}

function generateSalt() {
    let s = crypto.randomInt(100000000, 1000000000).toString()
    return Number(s)
}

export {
    config,
    connectMongo,
    sleep,
    Transaction,
    Evmlog,
    Status,
    Order,
    getLastBlockNumber,
    getBlockByNumber,
    getEvmLogs,
    getStatusId,
    generateSalt,
    log,
}