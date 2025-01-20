import React from 'react';
import { Utensils } from 'lucide-react';
import { useCalories } from '../hooks/useCalories';

export default function Summary() {
  const { totalCalories, foodPosts } = useCalories();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-2 mb-6">
          <Utensils className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">Calorie Summary</h2>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600">{totalCalories}</div>
            <div className="text-sm text-gray-500 mt-1">Total Calories</div>
          </div>

          <div className="space-y-4">
            {foodPosts.map((post) => (
              <div key={post.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex-1">
                  <p className="text-gray-700 truncate">{post.content}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-indigo-600">{post.calories}</span>
                  <span className="text-gray-500 text-sm ml-1">kcal</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}