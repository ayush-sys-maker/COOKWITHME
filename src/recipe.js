
 import React from 'react';
import './RecipeCard.css';

 function RecipeCard({ recipe }) {
  return (
    <div className="modern-recipe-card">

      {/* Header */}
      <div className="recipe-header">
                <div className="recipe-title">{recipe.title}</div>

        <div className="recipe-details">
          <button className="btn btn-primary">Servings: {recipe.servings}</button>
          <button className="btn btn-danger">Time: {recipe.time.total}</button>
        </div>

      
      </div>

      {/* Body */}
      <div className="recipe-body">
        
        {/* Ingredients */}
        <div className="ingredients">
          <div className="section-title">Ingredients</div>
          <ul>
            {recipe.ingredients.map((ing, i) => (
              <li className='ingredients-li' key={i}>{ing.item} — {ing.quantity}</li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="steps">
          <div className="section-title">Steps</div>
          <ol>
            {recipe.steps.map((step, i) => (
              <li className='steps-li'  key={i}>{step}</li>
            ))}
          </ol>
        </div>

      </div>

      {/* Footer */}
      <div className="recipe-footer">
  <table className="nutrition-table">
    <tbody>
      <tr>
        <th>Protein</th>
        <td>{recipe.nutrition.protein}</td>
      </tr>
      <tr>
        <th>Fat</th>
        <td>{recipe.nutrition.fat}</td>
      </tr>
      <tr>
        <th>Calories</th>
        <td>{recipe.nutrition.calories}</td>
      </tr>
    </tbody>
  </table>
</div>


      {/* Description */}
      <div className="About">
        <strong>Description</strong>
        <p>{recipe.description}</p>
      </div>

    </div>
  );
}


export default RecipeCard;