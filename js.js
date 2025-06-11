'use strict';

// ページ読み込み後に動作確認
document.addEventListener("DOMContentLoaded", () => {
    console.log('JavaScriptファイルが正常に読み込まれました！');
});

/****************************************************
Firebase設定
****************************************************/
// FirebaseのSDKをインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getDatabase, ref, push, set, onChildAdded, remove, onChildRemoved, update, onChildChanged }
    from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";
import firebaseConfig from "./firebaseConfig.js";  // コンフィグをインポート！

// Firebaseを初期化
const app = initializeApp(firebaseConfig);          //各種設定をappに格納
const db = getDatabase(app);                        //各種設定（app）をdbに適用することで、RealtimeDBに接続
const chatRef = ref(db, "memo/chat");               //チャット用 (memo/chat)のデータ参照先を設定
const taskRef = ref(db, "memo/task");               //タスク用 (memo/task) のデータ参照先を設定

/****************************************************
関数等：htmlのscreen1、screen2の上から下の順番
****************************************************/
// 1⃣ロード・リロード（chatAreaにチャット履歴を表示）
//もしかして、Firebaseだとブラウザのローカルストレージと違って、再読み込みは必要ない？➡どうやら不要みたい

// 2⃣初期画面➡タスク登録画面
$("#btnScreen2").on("click",function(){
    $("#screen1").addClass("hidden");
    $("#screen2").removeClass("hidden");

    // 表示を更新
    renderTasks();
});

// 3⃣チャット内容を登録（①FB送信、②chatAreaにチャット履歴を表示）
// ①FB送信
$("#chatRegister").on("click",function(){
    const chat = {
        chatter: $("#chatter").val(),
        chatText: $("#chatText").val(),
    }
    //データの塊をfirebaseに登録する処理
    //push(chatRef) により、memo/chat に新しいchatの格納場所を確保
    //push() を使うと、一意のID (-Nx123abc) が生成されるため、chatが個別に管理される
    const newPostRef = push(chatRef);
    //set(newPostRef, chat) を使い、Firebaseのデータベースにchatを送信
    //newPostRef は push(chatRef) で作られた場所なので、そこに chat のデータを書き込む。
    //■　keyとvalueをセットにして送信するようなもの
    set(newPostRef, chat);
    //全ての登録が終わった後、入力欄をクリアする
    $("#chatter").val("");
    $("#chatText").val("");
});

// ②chatAreaにチャット履歴を表示
//onChildAddedは、Firebaseの memo/chat に新しいデータが追加されたときに実行されるリスナー
//chatRef は memo/chat を指すので、新しいメッセージが入ると、この関数が発火
onChildAdded(chatRef, function(data){     //dataはここでだけ使う仮引数（ローカル変数）
    const chat = data.val();
    //data.key を取得することで、メッセージのユニークな識別ID ("-N123abcxyz") を取得
    const key = data.key;

    let html = `
        <div class="chatRireki">
            <p>${chat.chatter}</p>
            <p>${chat.chatText}</p>
        </div>
    `
    $("#chatArea").append(html);
});

// 4⃣タスク登録画面➡初期画面　1⃣の処理を追加➡追加は不要（1⃣が不要なのと同様）
$("#btnScreen1").on("click",function(){
    $("#screen2").addClass("hidden");
    $("#screen1").removeClass("hidden");
});

// 5⃣タスク内容を新規登録（①FB送信、②taskAreaに既往タスクを再読み込み）
// ①FB送信
$("#taskRegister").on("click",function(){
    const task = {
        taskPlayer: $("#taskPlayer").val(),
        taskDate: $("#taskDate").val(),
        taskMatter: $("#taskMatter").val(),
    }

    const newPostRef = push(taskRef);
    set(newPostRef, task);
    //全ての登録が終わった後、入力欄をクリアする
    $("#taskPlayer").val("");
    $("#taskDate").val("");
    $("#taskMatter").val("");
});

// ②taskAreaに既往タスクを再読み込み
let tasks = []; // タスクの一覧を保存する配列

onChildAdded(taskRef, function (data) {
    const task = data.val();
    const key = data.key;

    // 取得したデータを配列に追加
    tasks.push({
        key: key,
        taskPlayer: task.taskPlayer,
        taskDate: task.taskDate,
        taskMatter: task.taskMatter
    });

    // 期限順にソート（昇順: 古い日付が上）
    tasks.sort((a, b) => new Date(a.taskDate) - new Date(b.taskDate));

    // ■　表示を更新（他の関数も利用）
    renderTasks();
});

// 画面更新関数
function renderTasks() {
    $(".taskArea").empty(); // 画面の既存タスクをクリア

    //配列オブジェクト（tasks）が メソッド（forEach() ）を持っていて、そのメソッドに対して、引数（task）を1つずつ適用して処理
    tasks.forEach(task => {
        let html = `
            <div class="taskRireki" data-key="${task.key}">
                <div class="taskSet">
                    <label>担当者:</label>
                    <input type="text" value="${task.taskPlayer}">
                </div>
                <div class="taskSet">
                    <label>期限　:</label>
                    <input type="date" value="${task.taskDate}">
                </div>
                <div class="taskSet">
                    <label>内容　:</label>
                    <textarea>${task.taskMatter}</textarea>
                </div>
                <div class="btnTaskSet">
                    <button class="taskRenew">更新</button>
                    <button class="taskDelete">削除</button>
                </div>
            </div>
        `;
        $(".taskArea").append(html);
    });
}

// 6⃣既往タスクの完了登録（①FB送信、②taskAreaの対象タスクをグレーアウト）
// ★後日対応

// 7⃣既往タスクを更新（①FB送信、②taskAreaに既往タスクを再読み込み）➡散々Copilotに聞いたが非同期処理でうまくいかず
$(document).on("click", ".taskRenew", function () {
    const key = $(this).closest(".taskRireki").data("key");
    const taskToRenewRef = ref(db, `memo/task/${key}`);

    // 更新前の `tasks` をコピー（この時点ではまだ変更されていない！）
    const tasksBeforeUpdate = [...tasks];  
    console.log("🔥 正しく保存した更新前の tasks:", tasksBeforeUpdate);

    const updatedTask = {
        taskPlayer: $(this).closest(".taskRireki").find("input[type='text']").val(),
        taskDate: $(this).closest(".taskRireki").find("input[type='date']").val(),
        taskMatter: $(this).closest(".taskRireki").find("textarea").val(),
    };

    update(taskToRenewRef, updatedTask).then(() => {
        console.log(`✅ 更新成功: ${key}`);

        // 更新処理
        tasks = tasks.map(task => task.key === key ? { ...task, ...updatedTask } : task);
        console.log("✅ 更新後の tasks:", tasks);

        // 更新処理
        renderTasks();

    }).catch(error => {
        console.error("❌ 更新エラー:", error);
    });
});

// 8⃣既往タスクの削除（①FB送信、②taskAreaに既往タスクを再読み込み）
//$(document).on() を使うことで、動的に追加された .taskDelete にもオンクリックイベントを適用できる
$(document).on("click", ".taskDelete", function () {
    // $(this) → クリックされた .taskDelete ボタンを指す
    // .closest(".taskRireki") → そのボタンを含む .taskRireki を取得
    // .data("key") → タスクのユニークな識別ID (data-key) を取得
    // この key を使って、削除対象を特定
    const key = $(this).closest(".taskRireki").data("key");

    // Firebaseの「memo/task/${key}」というパスを取得し変数に格納
    const taskToDeleteRef = ref(db, `memo/task/${key}`);

    // パスを引数とするremove を処理し、Firebaseの該当タスクを削除
    // .then(() => {}) を使うことで、削除が成功したら次の処理を実行
    remove(taskToDeleteRef).then(() => {
        console.log(`削除成功: ${key}`);           //★後で削除
        // クリックされた .taskDelete ボタンの親 .taskRireki を削除（Firebaseだけでなくhtmlからも削除）
        $(this).closest(".taskRireki").remove();
        
        // tasks 配列から該当タスクを削除
        // filter() の具体的な動作
        // この目的は タスクのリストから特定のタスク (key) を削除すること
        // 1️⃣ tasks.filter() を実行すると、tasks の 各要素 (task) を順番に処理
        // 2️⃣ task.key !== key の条件を満たす タスクだけを新しい配列として返す
        // 3️⃣ その結果、新しい配列が tasks に代入され、削除済みの要素が含まれなくなる
        tasks = tasks.filter(task => task.key !== key);

        // 表示を更新
        renderTasks();
    
    // remove()は、は 非同期処理 (async operation) を行う関数で、実行すると Promise を返す
    // 処理に成功 (resolve) → 処理が正常に完了した場合、次の .then() に進む
    // 失敗 (reject) → 処理が失敗した場合、catch() に進んでエラー処理を行う
    }).catch(error => {
        console.error("削除エラー:", error);
    });
});
