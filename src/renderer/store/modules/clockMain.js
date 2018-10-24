
import { startTypes } from "../../constants";

/**
 * 用户存储的配置 || 默认配置
 */
const config = JSON.parse(localStorage.getItem("config") || "{}");
Object.assign(config, {
    workTime: 2, // 工作时间
    shotRestTime: 1, // 短暂休息时间
    longRestTime: 15, // 长暂休息时间
    longRestGap: 3, // 长休息时间的间隔(3个短 1 长)
    autoToNext: 0, // 是否自动进入下一个阶段, 默认: 否 TODO: 
});

const STATUS = {
    toWork: 'toWork', // 要进入工作状态, 默认
    toRest: 'toRest',
    working: 'working',
    resting: 'resting',
    pause: 'pause',
};

const state = {
    count: 10,

    setTime: config.workTime, // 用户可以临时设置的时间
    pastTime: 0, // 已经过去的时间
    totalTime: 0, // 总时间
    pastPercent: 0, // 过去的比例
    intervalGap: 1, // 定时器间隔 1s
    displayTime: "", // 倒计时显示的时钟

    lastStatus: "", // 上一步的状态
    curStatus: "none", // 当前状态

    status: 'toWork',
};

const mutations = {
    // test
    increment(state) {
        state.count++;
    },
    [startTypes.start_work](state) {
        state.status = STATUS.working;
        state.totalTime = state.setTime * 60; // 设置的时间为分钟,转换为秒
    },
    [startTypes.start_rest](state) {
        state.status = STATUS.resting;
        state.totalTime = state.setTime * 60;
    },
    [startTypes.over](state) {
        if (state.status === STATUS.working) {
            console.log('工作时间结束,准备进入短暂休息');
            state.status = STATUS.toRest;
            state.setTime = config.shotRestTime;
        } else {
            console.log('短暂休息结束,准备进入工作');
            state.status = STATUS.toWork;
            state.setTime = config.workTime;
        }

        state.pastTime = 0;
        state.pastPercent = 0;
        state.displayTime = "";
    },
    // 强制停止怎么处理?
    [startTypes.stop](state) {
        if (state.status === STATUS.working) {
            console.log('工作时间强制停止, 进入 准备工作状态');
            state.status = STATUS.toWork;
            state.setTime = config.workTime;
        } else {
            console.log('工作时间强制停止, 进入 准备休息状态');
            state.status = STATUS.toRest;
            state.setTime = config.shotRestTime;
        }
        state.pastTime = 0;
        state.pastPercent = 0;
        state.displayTime = "";
    },
    [startTypes.pause](state) {
        console.log('暂停, 设置暂停状态,记录原来的状态');
        state.lastStatus = state.status;
        state.status = STATUS.pause;
    },
    [startTypes.continue](state) {
        state.status = state.lastStatus;
        state.lastStatus = '';
    },
    [startTypes.updateSetTime](state, vaule) {
        state.setTime = vaule;
        // 同时修改配置, TODO: 
        if (state.status === STATUS.toWork) {
            config.workTime = state.setTime;
        } else {
            config.shotRestTime = state.setTime;
        }
    },
    [startTypes.incrPastTime](state, fixVal) {
        state.pastTime += fixVal || state.intervalGap * 20;
        state.pastPercent = parseFloat((state.pastTime / state.totalTime * 100).toFixed(2));
        state.displayTime = _toTimeString(state.totalTime - state.pastTime);
    }
};

const _toTimeString = (second) => {
    let remainSecond = second;
    let hour = (remainSecond / 60 / 60) | 0;
    remainSecond -= hour ? hour * 3600 : 0;
    let minute = (remainSecond / 60) | 0;
    remainSecond -= minute ? minute * 60 : 0;
    let str = "";
    str += hour ? `${_padZero(hour)}:` : "";
    str += minute ? `${_padZero(minute)}:` : "00:";
    str += _padZero(remainSecond);
    return str;
};

const _padZero = (num) => {
    return num < 10 ? `0${num}` : num;
};


let _timer_1 = null;

const actions = {
    increment: ({ commit }) => commit("increment"),
    [startTypes.start]: ({ commit, state }) => {
        console.log("start-, state.lastStatus: ", state.lastStatus);
        commit(startTypes.start_work);
    },
    [startTypes.start_work]: ({ commit, dispatch }) => {
        commit(startTypes.start_work);
        dispatch('_startInterval');
    },
    [startTypes.start_rest]: ({ commit, dispatch }) => {
        commit(startTypes.start_rest);
        dispatch('_startInterval');
    },
    [startTypes.over]: ({ commit, state }) => {
        console.log('over--', state.curStatus, state.lastStatus);
        commit(startTypes.over);
    },
    [startTypes.incrPastTime]: ({ commit }, fixVal) => commit(startTypes.incrPastTime, fixVal),
    [startTypes.pause]: ({ commit }) => {
        clearInterval(_timer_1);
        _timer_1 = null;
        commit(startTypes.pause);
    },
    [startTypes.continue]: ({ commit, dispatch }) => {
        commit(startTypes.continue);
        dispatch('_startInterval');
    },
    [startTypes.stop]: ({ commit }) => {
        clearInterval(_timer_1);
        _timer_1 = null;
        commit(startTypes.stop);
    },
    _startInterval({ commit, state, dispatch }) {
        commit(startTypes.incrPastTime, 0);
        _timer_1 = setInterval(() => {
            // console.log(state.pastTime, state.totalTime);
            if (state.pastTime >= state.totalTime) {
                dispatch('_curOver');
                return;
            }
            commit(startTypes.incrPastTime);
        }, state.intervalGap * 1000);
    },
    _curOver({ commit, state, dispatch }) {
        commit(startTypes.over);
        clearInterval(_timer_1);
        _timer_1 = null;
        // 屏幕强制全屏弹出
        webIpc.setFullScreen(true);
        webIpc.showMainWindow();
    },
    // incrementAsync({ commit }) {
    //     return new Promise((resolve, reject) => {
    //         setTimeout(() => {
    //             commit("increment");
    //             resolve();
    //         }, 1000);
    //     });
    // }
};

// getters are functions
const getters = {
    // test
    cartTotal: state => state.count * 2,

    isWorking: state => state.status === STATUS.working,
    isResting: state => state.status === STATUS.resting,
    isPauseing: state => state.status === STATUS.pause,
    isToRest: state => { // 要进入到休息
        return state.status === STATUS.toRest
    },
    isToWork: state => { // 要进入到休息
        return state.status === STATUS.toWork
    },
};

export default {
    // namespaced: true,
    state,
    getters,
    actions,
    mutations
};
