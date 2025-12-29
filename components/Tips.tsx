
import React, { useState } from 'react';

export const Tips: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left p-4 flex justify-between items-center"
                aria-expanded={isExpanded}
                aria-controls="tips-content"
            >
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.706-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 12.122l.707-.707a1 1 0 10-1.414-1.414l-.707.707a1 1 0 001.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" />
                    </svg>
                    看图说话小贴士
                </h2>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isExpanded && (
                <div id="tips-content" className="p-4 pt-0 text-gray-700">
                    <p className="mb-4 text-lg leading-relaxed">
                        老师说：请说说这幅图的<span className="text-red-600 text-2xl font-bold mx-1">内容</span>，并谈谈你的<span className="text-red-600 text-2xl font-bold mx-1">看法</span>和<span className="text-red-600 text-2xl font-bold mx-1">感受</span>。
                    </p>
                    <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-bold text-lg mb-2 text-blue-600">使用 W-A-T-E-R 模式来描述:</h3>
                        <ul className="space-y-1 list-disc list-inside">
                            <li><span className="font-bold">W</span>ho (人物), <span className="font-bold">W</span>here (地点), <span className="font-bold">W</span>hat (物品)</li>
                            <li><span className="font-bold">A</span>ppearance (外观形态)</li>
                            <li><span className="font-bold">T</span>hing they are doing (动作/行为)</li>
                            <li><span className="font-bold">E</span>motion (感受), <span className="font-bold">E</span>xplanation (解释)</li>
                            <li><span className="font-bold">R</span>eaction (反应)</li>
                        </ul>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold">开头可以这样说：</p>
                        <p className="italic bg-gray-100 p-2 rounded">
                            “<span className="text-red-600 text-2xl font-bold">这幅图描绘的是</span>……”
                        </p>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold">说出你的看法 and 感受：</p>
                        <p className="bg-gray-100 p-2 rounded">图片中哪些行为是对的，哪些是错的？你看到他们这样做时你的心情怎么样？</p>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold">最后一定要有一个总结：</p>
                        <p className="italic bg-gray-100 p-2 rounded">
                            “<span className="text-red-600 text-2xl font-bold">总的来说</span>……”
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
